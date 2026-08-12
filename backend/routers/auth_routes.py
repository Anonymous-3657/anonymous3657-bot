"""Student + staff authentication: register, verify, login, OTP, password reset, profile."""
import re
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator

from auth import (BLOCKED_STATUS_MESSAGE, DEFAULT_ROLE, JWT_ALGORITHM,
                  SESSION_STATUSES, STATUS_ACTIVE, STATUS_PENDING, _secret,
                  assert_can_hold_session, check_lockout, clear_auth_cookies,
                  clear_failures, create_access_token, create_refresh_token,
                  get_current_user, hash_password, lockout_identifier,
                  public_user, record_failure, set_auth_cookies,
                  verify_password)
from database import db
from email_service import (public_app_url, send_otp_email,
                           send_password_reset_email, send_security_alert_email,
                           send_verification_email)
from security import (RESET_TTL_MINUTES, VERIFY_TTL_HOURS, client_ip,
                      consume_token, issue_otp, issue_token, rate_limit,
                      record_event, verify_otp)

router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,24}$")
INDIAN_PHONE_RE = re.compile(r"^[6-9]\d{9}$")
GENERIC_RESET_MESSAGE = (
    "If an account exists for that email, we have sent a password reset link."
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_password(password: str):
    """Server-side strength rules — the client indicator is only a hint."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    checks = [
        (r"[a-z]", "a lowercase letter"),
        (r"[A-Z]", "an uppercase letter"),
        (r"\d", "a number"),
    ]
    missing = [label for pattern, label in checks if not re.search(pattern, password)]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Password must include {', '.join(missing)}"
        )


async def link_base(request: Request) -> str:
    return public_app_url(request.headers.get("origin"))


async def issue_session(response: Response, user: dict):
    uid = str(user["_id"])
    set_auth_cookies(
        response, create_access_token(uid, user["email"]), create_refresh_token(uid)
    )


async def send_verification(user: dict, request: Request):
    token = await issue_token(str(user["_id"]), "email_verify", timedelta(hours=VERIFY_TTL_HOURS))
    base = await link_base(request)
    await send_verification_email(user["email"], user.get("name", "there"),
                                  f"{base}/verify-email?token={token}")


# ---------------------------------------------------------------- registration
class RegisterPayload(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    username: str = Field(min_length=3, max_length=24)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str
    university_id: str
    college_id: str | None = None
    course_id: str
    semester_or_year: str = Field(min_length=1, max_length=40)
    accept_terms: bool
    accept_privacy: bool

    @field_validator("username")
    @classmethod
    def check_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-24 characters: letters, numbers or underscore")
        return v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if not INDIAN_PHONE_RE.match(digits):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return digits


@router.post("/register", status_code=201)
async def register(payload: RegisterPayload, request: Request, response: Response):
    await rate_limit(f"register:{client_ip(request)}", limit=10, window_seconds=3600,
                     message="Too many sign-up attempts. Please try again later.")

    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not payload.accept_terms or not payload.accept_privacy:
        raise HTTPException(status_code=400,
                            detail="Please accept the Terms and Privacy Policy to continue")
    validate_password(payload.password)

    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if await db.users.find_one({"username": payload.username}):
        raise HTTPException(status_code=409, detail="That username is taken")

    university = await db.universities.find_one({"_id": ObjectId(payload.university_id)}) \
        if ObjectId.is_valid(payload.university_id) else None
    course = await db.courses.find_one({"_id": ObjectId(payload.course_id)}) \
        if ObjectId.is_valid(payload.course_id) else None
    if not university or not course:
        raise HTTPException(status_code=400, detail="Select a valid university and course")

    now = now_iso()
    doc = {
        "name": payload.name.strip(),
        "username": payload.username,
        "email": email,
        "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        # Role is server-assigned. A client can never choose it.
        "role": DEFAULT_ROLE,
        "status": STATUS_PENDING,
        "is_deleted": False,
        "email_verified": False,
        "phone_verified": False,
        "avatar_url": None,
        "bio": None,
        "university_id": str(university["_id"]),
        "college_id": payload.college_id or None,
        "course_id": str(course["_id"]),
        "semester_or_year": payload.semester_or_year.strip(),
        "accepted_terms_at": now,
        "accepted_privacy_at": now,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id

    await send_verification(doc, request)
    await issue_session(response, doc)
    await record_event("registration", request, str(result.inserted_id), email)
    return {"user": public_user(doc), "message": "Check your email to verify your account."}


@router.get("/username-available")
async def username_available(username: str):
    clean = username.strip().lower()
    if not USERNAME_RE.match(clean):
        return {"available": False, "reason": "Use 3-24 letters, numbers or underscore"}
    taken = await db.users.find_one({"username": clean})
    return {"available": not taken}


# ---------------------------------------------------------------------- login
class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


@router.post("/login")
async def login(payload: LoginPayload, request: Request, response: Response):
    email = payload.email.lower().strip()
    identifier = lockout_identifier(email)
    await check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await record_failure(identifier)
        await record_event("login_failure", request, email=email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    status = user.get("status", STATUS_ACTIVE)
    if user.get("is_deleted") or status not in SESSION_STATUSES:
        await record_event("login_blocked", request, str(user["_id"]), email,
                           {"status": status})
        raise HTTPException(status_code=403, detail=BLOCKED_STATUS_MESSAGE.get(
            status, "Your account cannot be accessed right now."))

    await clear_failures(identifier)
    now = now_iso()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})
    user["last_login_at"] = now

    await issue_session(response, user)
    await record_event("login_success", request, str(user["_id"]), email)
    return {"user": public_user(user)}


@router.post("/logout")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    await record_event("logout", request, str(user["_id"]), user.get("email"))
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Account unavailable")
    assert_can_hold_session(user)
    await issue_session(response, user)
    return {"user": public_user(user)}


# ------------------------------------------------------- email verification
class TokenPayload(BaseModel):
    token: str = Field(min_length=10, max_length=200)


@router.post("/verify-email")
async def verify_email(payload: TokenPayload, request: Request):
    user_id = await consume_token(payload.token, "email_verify")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=400, detail="This link is no longer valid")

    updates = {"email_verified": True, "updated_at": now_iso()}
    if user.get("status") == STATUS_PENDING:
        updates["status"] = STATUS_ACTIVE
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    await record_event("email_verified", request, user_id, user.get("email"))
    return {"message": "Your email is verified. Welcome to CG STUDENT PORTAL."}


@router.post("/resend-verification")
async def resend_verification(request: Request, user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        return {"message": "Your email is already verified."}
    await rate_limit(f"verify_resend:{user['email']}", limit=3, window_seconds=900,
                     message="Please wait a few minutes before requesting another email.")
    await send_verification(user, request)
    return {"message": "Verification email sent. Check your inbox."}


class ChangeEmailPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


@router.post("/change-email")
async def change_email(payload: ChangeEmailPayload, request: Request,
                       user: dict = Depends(get_current_user)):
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=403, detail="Password is incorrect")
    email = payload.email.lower().strip()
    if email == user.get("email"):
        raise HTTPException(status_code=400, detail="That is already your email address")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="That email is not available")

    previous = user.get("email")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"email": email, "email_verified": False,
                  "status": STATUS_PENDING, "updated_at": now_iso()}},
    )
    user["email"] = email
    await send_verification(user, request)
    await send_security_alert_email(previous, user.get("name", "there"), "Email changed",
                                    f"Your account email was changed to {email}.")
    await record_event("email_changed", request, str(user["_id"]), email)
    return {"message": "Email updated. Check your new inbox to verify it."}


# ------------------------------------------------------------------------ OTP
class OtpRequestPayload(BaseModel):
    purpose: str = Field(pattern="^(email_otp)$")


@router.post("/request-otp")
async def request_otp(payload: OtpRequestPayload, request: Request,
                      user: dict = Depends(get_current_user)):
    await rate_limit(f"otp_request:{user['email']}", limit=3, window_seconds=600,
                     message="Please wait before requesting another code.")
    code = await issue_otp(str(user["_id"]), payload.purpose)
    await send_otp_email(user["email"], user.get("name", "there"), code)
    await record_event("otp_requested", request, str(user["_id"]), user.get("email"),
                       {"purpose": payload.purpose})
    return {"message": "We sent a 6-digit code to your email."}


class OtpVerifyPayload(BaseModel):
    purpose: str = Field(pattern="^(email_otp)$")
    code: str = Field(min_length=6, max_length=6)


@router.post("/verify-otp")
async def verify_otp_route(payload: OtpVerifyPayload, request: Request,
                           user: dict = Depends(get_current_user)):
    await rate_limit(f"otp_verify:{user['email']}", limit=10, window_seconds=600,
                     message="Too many attempts. Please wait before trying again.")
    await verify_otp(str(user["_id"]), payload.purpose, payload.code)
    updates = {"email_verified": True, "updated_at": now_iso()}
    if user.get("status") == STATUS_PENDING:
        updates["status"] = STATUS_ACTIVE
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    await record_event("email_verified", request, str(user["_id"]), user.get("email"),
                       {"via": "otp"})
    return {"message": "Verified. Thanks for confirming."}


# ------------------------------------------------------------- password reset
class ForgotPayload(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPayload, request: Request):
    email = payload.email.lower().strip()
    await rate_limit(f"forgot:{email}", limit=3, window_seconds=900,
                     message="Please wait a few minutes before requesting another reset email.")
    user = await db.users.find_one({"email": email, "is_deleted": {"$ne": True}})
    if user:
        token = await issue_token(str(user["_id"]), "password_reset",
                                  timedelta(minutes=RESET_TTL_MINUTES))
        base = await link_base(request)
        await send_password_reset_email(email, user.get("name", "there"),
                                       f"{base}/reset-password?token={token}")
        await record_event("password_reset_requested", request, str(user["_id"]), email)
    else:
        await record_event("password_reset_requested_unknown", request, email=email)
    # Identical response either way — never reveals whether the account exists.
    return {"message": GENERIC_RESET_MESSAGE}


class ResetPayload(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str


@router.post("/reset-password")
async def reset_password(payload: ResetPayload, request: Request, response: Response):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    validate_password(payload.password)

    user_id = await consume_token(payload.token, "password_reset")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=400, detail="This link is no longer valid")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(payload.password), "updated_at": now_iso()}},
    )
    await clear_failures(lockout_identifier(user["email"]))
    clear_auth_cookies(response)
    await send_security_alert_email(user["email"], user.get("name", "there"), "Password changed")
    await record_event("password_reset_completed", request, user_id, user.get("email"))
    return {"message": "Password updated. You can sign in with your new password."}


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, request: Request,
                          user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=403, detail="Your current password is incorrect")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    validate_password(payload.password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(payload.password), "updated_at": now_iso()}},
    )
    await send_security_alert_email(user["email"], user.get("name", "there"), "Password changed")
    await record_event("password_changed", request, str(user["_id"]), user.get("email"))
    return {"message": "Password updated."}


# -------------------------------------------------------------------- profile
class ProfilePayload(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=400)
    avatar_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=15)
    university_id: str | None = None
    college_id: str | None = None
    course_id: str | None = None
    semester_or_year: str | None = Field(default=None, max_length=40)


@router.put("/profile")
async def update_profile(payload: ProfilePayload, request: Request,
                         user: dict = Depends(get_current_user)):
    """Only profile fields — role, status and verification flags are never accepted here."""
    updates = {}
    data = payload.model_dump(exclude_none=True)

    if "phone" in data:
        digits = re.sub(r"\D", "", data["phone"])
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if not INDIAN_PHONE_RE.match(digits):
            raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")
        if digits != user.get("phone"):
            updates["phone"] = digits
            updates["phone_verified"] = False

    for field in ("name", "bio", "avatar_url", "semester_or_year"):
        if field in data:
            updates[field] = data[field].strip() or None

    for field in ("university_id", "college_id", "course_id"):
        if field in data:
            value = data[field]
            if value and not ObjectId.is_valid(value):
                raise HTTPException(status_code=400, detail=f"Invalid {field.replace('_id', '')}")
            updates[field] = value or None

    if not updates:
        raise HTTPException(status_code=400, detail="No changes to save")

    updates["updated_at"] = now_iso()
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    await record_event("profile_updated", request, str(user["_id"]), user.get("email"),
                       {"fields": sorted(updates.keys())})
    return {"user": public_user(await db.users.find_one({"_id": user["_id"]}))}


@router.get("/audit-events")
async def my_audit_events(user: dict = Depends(get_current_user), limit: int = 20):
    cursor = db.audit_events.find(
        {"user_id": str(user["_id"])},
        {"_id": 0, "event": 1, "ip": 1, "created_at": 1},
    ).sort("created_at", -1).limit(min(limit, 50))
    return {"items": await cursor.to_list(50)}
