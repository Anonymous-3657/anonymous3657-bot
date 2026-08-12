"""Authentication + authorization core: hashing, JWT, principal, role gates."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Request, Response

from database import db

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60
REFRESH_TTL_DAYS = 7
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

ROLE_PERMISSIONS = {
    "admin": {
        "catalog:read", "catalog:write", "catalog:delete",
        "resource:read", "resource:write", "resource:delete", "resource:approve",
        "user:read", "user:write", "user:delete",
    },
    "moderator": {
        "catalog:read", "resource:read", "resource:write", "resource:approve",
    },
    "contributor": {"catalog:read", "resource:read", "resource:write"},
    "student": {"catalog:read", "resource:read"},
}

ROLE_RANK = {"student": 1, "contributor": 2, "moderator": 3, "admin": 4}


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_TTL_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if token:
        return token
    header = request.headers.get("Authorization", "")
    return header[7:] if header.startswith("Bearer ") else None


def public_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "username": doc.get("username"),
        "email": doc.get("email"),
        "role": doc.get("role", "student"),
        "status": doc.get("status", "active"),
        "created_at": doc.get("created_at"),
        "last_login_at": doc.get("last_login_at"),
    }


async def get_current_user(request: Request) -> dict:
    """Principal is always re-read from the database, never trusted from claims."""
    token = _token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except (InvalidId, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user or user.get("status") != "active" or user.get("is_deleted"):
        raise HTTPException(status_code=401, detail="Account unavailable")
    return user


def require_permission(permission: str):
    """Deny-by-default gate. Role is resolved from the live user document."""

    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        perms = ROLE_PERMISSIONS.get(user.get("role", "student"), set())
        if permission not in perms:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency


# ---------- Brute force protection ----------
def lockout_identifier(email: str) -> str:
    """Keyed on the account only — proxy IPs rotate and would split the counter."""
    return f"email:{email.lower().strip()}"


async def check_lockout(identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return
    if doc.get("count", 0) >= MAX_FAILED_ATTEMPTS:
        locked_until = doc.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. Try again in a few minutes.",
            )
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failure(identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    count = (doc.get("count", 0) if doc else 0) + 1
    update = {"identifier": identifier, "count": count}
    if count >= MAX_FAILED_ATTEMPTS:
        update["locked_until"] = (
            datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        ).isoformat()
    await db.login_attempts.update_one(
        {"identifier": identifier}, {"$set": update}, upsert=True
    )


async def clear_failures(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ---------- First admin bootstrap ----------
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        return None
    email = email.lower().strip()
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "name": "Platform Admin",
            "username": "admin",
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "status": "active",
            "is_deleted": False,
            "email_verified": True,
            "phone_verified": False,
            "created_at": now,
            "updated_at": now,
        })
        return "created"
    if not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"password_hash": hash_password(password),
                      "role": "admin", "status": "active", "updated_at": now}},
        )
        return "updated"
    return "unchanged"
