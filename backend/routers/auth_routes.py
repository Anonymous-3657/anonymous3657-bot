"""Auth endpoints: login, logout, me, refresh. No public self-registration in Step 2a."""
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from auth import (JWT_ALGORITHM, _secret, check_lockout, clear_auth_cookies,
                  clear_failures, create_access_token, create_refresh_token,
                  get_current_user, lockout_identifier, public_user,
                  record_failure, set_auth_cookies, verify_password)
from database import db

router = APIRouter(prefix="/auth", tags=["auth"])


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
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") != "active" or user.get("is_deleted"):
        raise HTTPException(status_code=403, detail="Account is not active")

    await clear_failures(identifier)
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})
    user["last_login_at"] = now

    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return {"user": public_user(user)}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
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

    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account unavailable")

    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, user["email"]), create_refresh_token(uid))
    return {"user": public_user(user)}
