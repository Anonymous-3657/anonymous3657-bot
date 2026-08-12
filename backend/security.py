"""Verification tokens, OTP codes, rate limiting and audit events."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request

from database import db

logger = logging.getLogger(__name__)

VERIFY_TTL_HOURS = 24
RESET_TTL_MINUTES = 60
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def digest(value: str) -> str:
    """Tokens and OTPs are only ever persisted as hashes."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------- Single-use tokens (email verification, password reset) ----------
async def issue_token(user_id: str, purpose: str, ttl: timedelta) -> str:
    raw = secrets.token_urlsafe(32)
    await db.auth_tokens.delete_many({"user_id": user_id, "purpose": purpose})
    await db.auth_tokens.insert_one({
        "user_id": user_id,
        "purpose": purpose,
        "token_hash": digest(raw),
        "expires_at": iso(now_utc() + ttl),
        "created_at": iso(now_utc()),
        "used_at": None,
    })
    return raw


async def consume_token(raw: str, purpose: str) -> str:
    """Returns the user_id, or raises. Tokens are strictly single-use."""
    doc = await db.auth_tokens.find_one({"token_hash": digest(raw), "purpose": purpose})
    if not doc or doc.get("used_at"):
        raise HTTPException(status_code=400, detail="This link is invalid or has already been used")
    if now_utc() > datetime.fromisoformat(doc["expires_at"]):
        raise HTTPException(status_code=400, detail="This link has expired. Please request a new one")
    await db.auth_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used_at": iso(now_utc())}})
    return doc["user_id"]


# ---------- OTP ----------
async def issue_otp(user_id: str, purpose: str) -> str:
    code = f"{secrets.randbelow(1000000):06d}"
    await db.otp_codes.delete_many({"user_id": user_id, "purpose": purpose})
    await db.otp_codes.insert_one({
        "user_id": user_id,
        "purpose": purpose,
        "code_hash": digest(code),
        "expires_at": iso(now_utc() + timedelta(minutes=OTP_TTL_MINUTES)),
        "attempts": 0,
        "created_at": iso(now_utc()),
    })
    return code


async def verify_otp(user_id: str, purpose: str, code: str):
    doc = await db.otp_codes.find_one({"user_id": user_id, "purpose": purpose})
    if not doc:
        raise HTTPException(status_code=400, detail="Request a new code to continue")
    if doc.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect codes. Request a new one")
    if now_utc() > datetime.fromisoformat(doc["expires_at"]):
        await db.otp_codes.delete_one({"_id": doc["_id"]})
        raise HTTPException(status_code=400, detail="This code has expired. Request a new one")
    if doc["code_hash"] != digest(code):
        await db.otp_codes.update_one({"_id": doc["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect code")
    await db.otp_codes.delete_one({"_id": doc["_id"]})


# ---------- Generic rate limiting ----------
async def rate_limit(key: str, limit: int, window_seconds: int, message: str | None = None):
    """Fixed-window counter. Keyed by caller-supplied scope (email, ip, action)."""
    window_start = now_utc() - timedelta(seconds=window_seconds)
    doc = await db.rate_limits.find_one({"key": key})
    if doc and datetime.fromisoformat(doc["window_started_at"]) > window_start:
        if doc.get("count", 0) >= limit:
            raise HTTPException(
                status_code=429,
                detail=message or "Too many requests. Please wait a moment and try again.",
            )
        await db.rate_limits.update_one({"_id": doc["_id"]}, {"$inc": {"count": 1}})
        return
    await db.rate_limits.update_one(
        {"key": key},
        {"$set": {"key": key, "count": 1, "window_started_at": iso(now_utc())}},
        upsert=True,
    )


# ---------- Audit events ----------
async def record_event(event: str, request: Request | None = None, user_id: str | None = None,
                       email: str | None = None, meta: dict | None = None):
    """Never store passwords, OTP values or tokens here."""
    try:
        await db.audit_events.insert_one({
            "event": event,
            "user_id": user_id,
            "email": email,
            "ip": client_ip(request) if request else None,
            "user_agent": (request.headers.get("user-agent") if request else None),
            "meta": meta or {},
            "created_at": iso(now_utc()),
        })
    except Exception:  # noqa: BLE001 - auditing must never break a request
        logger.exception("Failed to record audit event %s", event)
