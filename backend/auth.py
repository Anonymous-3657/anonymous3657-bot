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
    "super_admin": {
        "catalog:read", "catalog:write", "catalog:delete",
        "resource:read", "resource:write", "resource:delete", "resource:approve",
        "syllabus:read", "syllabus:write", "syllabus:delete", "syllabus:publish",
        "user:read", "user:write", "user:delete",
        "finance:read", "finance:write", "support:read", "system:manage",
    },
    "admin": {
        "catalog:read", "catalog:write", "catalog:delete",
        "resource:read", "resource:write", "resource:delete", "resource:approve",
        "syllabus:read", "syllabus:write", "syllabus:delete", "syllabus:publish",
        "user:read", "user:write", "user:delete",
    },
    "moderator": {
        "catalog:read", "resource:read", "resource:write", "resource:approve",
        "syllabus:read", "syllabus:write", "syllabus:publish",
    },
    "content_reviewer": {"catalog:read", "resource:read", "resource:approve", "syllabus:read"},
    "university_manager": {"catalog:read", "catalog:write", "resource:read"},
    "college_manager": {"catalog:read", "resource:read"},
    "finance_manager": {"catalog:read", "finance:read", "finance:write"},
    "support": {"catalog:read", "resource:read", "user:read", "support:read"},
    "contributor": {"catalog:read", "resource:read", "resource:write"},
    "student": {"catalog:read", "resource:read"},
}

ROLE_RANK = {
    "student": 1,
    "contributor": 2,
    "support": 3,
    "college_manager": 3,
    "content_reviewer": 4,
    "university_manager": 4,
    "finance_manager": 4,
    "moderator": 5,
    "admin": 8,
    "super_admin": 9,
}

DEFAULT_ROLE = "student"
# Roles allowed into the staff area at all. Individual endpoints still check
# their own permission, so this is an outer gate, not a replacement.
STAFF_ROLES = {
    "moderator", "content_reviewer", "support", "finance_manager",
    "university_manager", "college_manager", "admin", "super_admin",
}

STATUS_ACTIVE = "active"
STATUS_PENDING = "pending_verification"
# Only these statuses may hold a session at all.
SESSION_STATUSES = {STATUS_ACTIVE, STATUS_PENDING}
BLOCKED_STATUS_MESSAGE = {
    "suspended": "Your account is suspended. Contact support for help.",
    "banned": "This account has been banned.",
    "deactivated": "This account is deactivated.",
}


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Authentication is not configured on this server (JWT_SECRET missing).",
        )
    return secret


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
    # Plain-http local development cannot use Secure/None cookies.
    cross_site = os.environ.get("APP_ENV", "development") != "local"
    opts = {
        "httponly": True,
        "secure": cross_site,
        "samesite": "none" if cross_site else "lax",
        "path": "/",
    }
    response.set_cookie("access_token", access, max_age=ACCESS_TTL_MIN * 60, **opts)
    response.set_cookie("refresh_token", refresh, max_age=REFRESH_TTL_DAYS * 86400, **opts)


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
        "phone": doc.get("phone"),
        "avatar_url": doc.get("avatar_url"),
        "bio": doc.get("bio"),
        "role": doc.get("role", DEFAULT_ROLE),
        "status": doc.get("status", STATUS_ACTIVE),
        "email_verified": bool(doc.get("email_verified")),
        "phone_verified": bool(doc.get("phone_verified")),
        "university_id": doc.get("university_id"),
        "college_id": doc.get("college_id"),
        "college_code": doc.get("college_code"),
        "college_name": doc.get("college_name"),
        "college_type": doc.get("college_type"),
        "district": doc.get("district"),
        "course_id": doc.get("course_id"),
        "semester_or_year": doc.get("semester_or_year"),
        "permissions": sorted(ROLE_PERMISSIONS.get(doc.get("role", DEFAULT_ROLE), set())),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "last_login_at": doc.get("last_login_at"),
    }


def assert_can_hold_session(user: dict):
    """Suspended, banned and deactivated accounts can never hold a session."""
    status = user.get("status", STATUS_ACTIVE)
    if user.get("is_deleted"):
        raise HTTPException(status_code=401, detail="Account unavailable")
    if status not in SESSION_STATUSES:
        raise HTTPException(status_code=403, detail=BLOCKED_STATUS_MESSAGE.get(
            status, "Your account cannot be accessed right now."))


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
    if not user:
        raise HTTPException(status_code=401, detail="Account unavailable")
    assert_can_hold_session(user)
    return user


async def require_verified_user(user: dict = Depends(get_current_user)) -> dict:
    """Gate for sensitive authenticated features."""
    if not user.get("email_verified"):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address to use this feature.",
        )
    return user


async def require_staff(user: dict = Depends(get_current_user)) -> dict:
    """Outer gate for /api/admin. Students and contributors never pass."""
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff access only")
    return user


def require_permission(permission: str):
    """Deny-by-default gate. Role is resolved from the live user document."""

    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        perms = ROLE_PERMISSIONS.get(user.get("role", DEFAULT_ROLE), set())
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
