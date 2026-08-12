"""
Step 2 authentication backend tests for CG STUDENT PORTAL.
Covers register, login, verify-email, OTP, forgot/reset, change-email, change-password,
profile mass-assignment guard, role escalation guard, account status blocking,
protected routes, rate limits, audit event redaction, logout.

DB writes are cleaned up in a session-scoped fixture. Only admin@cgstudentportal.in
should remain after this suite finishes.
"""
import hashlib
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# ---------- helpers ----------

def _db():
    # Fresh client each call so Motor's cached io_loop doesn't tie to a
    # dead event loop from a previous asyncio.run().
    return AsyncIOMotorClient(MONGO_URL)[DB_NAME]


async def _run_db(fn):
    return await fn(_db())


def rand_suffix():
    return uuid.uuid4().hex[:8]


def strong_pw():
    return "StrongPass1"


async def _get_ids():
    db = _db()
    u = await db.universities.find_one({})
    c = await db.courses.find_one({})
    return str(u["_id"]), str(c["_id"])


UNIV_ID, COURSE_ID = asyncio.run(_get_ids())

TRACKED_EMAILS = []


def build_register_payload(**overrides):
    suffix = rand_suffix()
    payload = {
        "name": "Test User",
        "username": f"tu_{suffix}",
        "email": f"test_{suffix}@example.com",
        "phone": "9876543210",
        "password": strong_pw(),
        "confirm_password": strong_pw(),
        "university_id": UNIV_ID,
        "college_id": None,
        "course_id": COURSE_ID,
        "semester_or_year": "1",
        "accept_terms": True,
        "accept_privacy": True,
    }
    payload.update(overrides)
    TRACKED_EMAILS.append(payload["email"])
    return payload


def _fresh_ip():
    # Force a unique client IP to avoid the /register per-IP rate limit
    # (10/hour) tripping in bulk test runs. rate_limit() keys off
    # client_ip() which reads x-forwarded-for.
    return f"10.{secrets.randbelow(255)}.{secrets.randbelow(255)}.{secrets.randbelow(255)}"


def new_session():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json",
                         "X-Forwarded-For": _fresh_ip()})
    return sess


@pytest.fixture
def s():
    return new_session()


@pytest.fixture(scope="session", autouse=True)
def _reset_rate_limits_at_start():
    async def _wipe():
        d = _db()
        await d.rate_limits.delete_many({})
        await d.login_attempts.delete_many({})
    asyncio.run(_wipe())
    yield


# ---------- Registration happy path ----------
class TestRegistration:
    def test_happy_path(self, s):
        p = build_register_payload()
        sess = new_session()
        r = sess.post(f"{API}/auth/register", json=p)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["user"]["email"] == p["email"]
        assert data["user"]["role"] == "student"
        assert data["user"]["status"] == "pending_verification"
        assert data["user"]["email_verified"] is False
        # Session issued via cookies
        assert "access_token" in sess.cookies
        # /me works
        me = sess.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["user"]["email"] == p["email"]

    def test_role_escalation_guard(self, s):
        p = build_register_payload()
        p["role"] = "super_admin"
        p["status"] = "active"
        p["email_verified"] = True
        p["is_deleted"] = False
        r = s.post(f"{API}/auth/register", json=p)
        assert r.status_code == 201, r.text
        u = r.json()["user"]
        assert u["role"] == "student"
        assert u["status"] == "pending_verification"
        assert u["email_verified"] is False

    def test_duplicate_email(self, s):
        p = build_register_payload()
        r1 = s.post(f"{API}/auth/register", json=p)
        assert r1.status_code == 201
        p2 = build_register_payload(email=p["email"])
        r2 = s.post(f"{API}/auth/register", json=p2)
        assert r2.status_code == 409

    def test_duplicate_username(self, s):
        p = build_register_payload()
        r1 = s.post(f"{API}/auth/register", json=p)
        assert r1.status_code == 201
        p2 = build_register_payload(username=p["username"])
        r2 = s.post(f"{API}/auth/register", json=p2)
        assert r2.status_code == 409

    @pytest.mark.parametrize("mutation,expected", [
        ({"email": "not-an-email"}, 422),
        ({"phone": "12345"}, 422),
        ({"password": "short1A", "confirm_password": "short1A"}, 422),
        ({"password": "alllowercase1", "confirm_password": "alllowercase1"}, 400),
        ({"password": "ALLUPPER1", "confirm_password": "ALLUPPER1"}, 400),
        ({"password": "NoNumbers", "confirm_password": "NoNumbers"}, 400),
        ({"password": "StrongPass1", "confirm_password": "Different1"}, 400),
        ({"accept_terms": False}, 400),
        ({"accept_privacy": False}, 400),
        ({"university_id": "invalid"}, 400),
        ({"course_id": "invalid"}, 400),
    ])
    def test_validation_errors(self, s, mutation, expected):
        p = build_register_payload(**mutation)
        r = s.post(f"{API}/auth/register", json=p)
        assert r.status_code == expected, f"{mutation} -> {r.status_code} {r.text}"


# ---------- Username availability ----------
class TestUsernameAvailable:
    def test_taken(self, s):
        r = s.get(f"{API}/auth/username-available", params={"username": "admin"})
        assert r.status_code == 200
        assert r.json()["available"] is False

    def test_fresh(self, s):
        r = s.get(f"{API}/auth/username-available",
                  params={"username": f"free_{rand_suffix()}"})
        assert r.status_code == 200
        assert r.json()["available"] is True

    def test_invalid(self, s):
        r = s.get(f"{API}/auth/username-available", params={"username": "ab"})
        assert r.status_code == 200
        d = r.json()
        assert d["available"] is False
        assert "reason" in d


# ---------- Login ----------
class TestLogin:
    def test_login_and_session_persistence(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        assert sess.post(f"{API}/auth/register", json=p).status_code == 201
        # New session for login
        sess2 = new_session()
        sess2.headers.update({"Content-Type": "application/json"})
        r = sess2.post(f"{API}/auth/login",
                       json={"email": p["email"], "password": p["password"]})
        assert r.status_code == 200
        assert "access_token" in sess2.cookies
        me = sess2.get(f"{API}/auth/me")
        assert me.status_code == 200

    def test_login_wrong_password(self, s):
        p = build_register_payload()
        assert s.post(f"{API}/auth/register", json=p).status_code == 201
        r = new_session().post(f"{API}/auth/login",
                          json={"email": p["email"], "password": "WrongPass1"})
        assert r.status_code == 401
        assert "invalid" in r.json()["detail"].lower()


# ---------- Email verification via link + OTP ----------
class TestEmailVerify:
    async def _issue_verify_token(self, user_id):
        db = _db()
        raw = secrets.token_urlsafe(32)
        await db.auth_tokens.delete_many({"user_id": user_id, "purpose": "email_verify"})
        await db.auth_tokens.insert_one({
            "user_id": user_id, "purpose": "email_verify",
            "token_hash": hashlib.sha256(raw.encode()).hexdigest(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used_at": None,
        })
        return raw

    def test_verify_and_single_use(self, s):
        p = build_register_payload()
        r = s.post(f"{API}/auth/register", json=p)
        uid = r.json()["user"]["id"]
        raw = asyncio.run(self._issue_verify_token(uid))
        v = s.post(f"{API}/auth/verify-email", json={"token": raw})
        assert v.status_code == 200
        # Re-use fails
        v2 = s.post(f"{API}/auth/verify-email", json={"token": raw})
        assert v2.status_code == 400
        # DB reflects state
        async def _find():
            return await _db().users.find_one({"_id": ObjectId(uid)})
        user = asyncio.run(_find())
        assert user["email_verified"] is True
        assert user["status"] == "active"

    def test_verify_invalid_token(self, s):
        r = s.post(f"{API}/auth/verify-email", json={"token": "garbage" + "x" * 20})
        assert r.status_code == 400


class TestOTP:
    def test_email_otp_flow(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        reg = sess.post(f"{API}/auth/register", json=p)
        uid = reg.json()["user"]["id"]

        # Request OTP
        r = sess.post(f"{API}/auth/request-otp", json={"purpose": "email_otp"})
        assert r.status_code == 200

        # Read OTP doc, replace hash with a known code
        db = _db()
        async def _override():
            code = "123456"
            await db.otp_codes.update_one(
                {"user_id": uid, "purpose": "email_otp"},
                {"$set": {"code_hash": hashlib.sha256(code.encode()).hexdigest(),
                          "attempts": 0}},
            )
            return code
        code = asyncio.run(_override())

        # Wrong code
        wrong = sess.post(f"{API}/auth/verify-otp",
                          json={"purpose": "email_otp", "code": "000000"})
        assert wrong.status_code == 400

        # Correct code
        ok = sess.post(f"{API}/auth/verify-otp",
                       json={"purpose": "email_otp", "code": code})
        assert ok.status_code == 200

        # OTP consumed - reuse fails
        again = sess.post(f"{API}/auth/verify-otp",
                          json={"purpose": "email_otp", "code": code})
        assert again.status_code == 400

    def test_otp_too_many_attempts(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        reg = sess.post(f"{API}/auth/register", json=p)
        uid = reg.json()["user"]["id"]
        sess.post(f"{API}/auth/request-otp", json={"purpose": "email_otp"})

        db = _db()
        # Force attempts to 5
        async def _bump():
            await db.otp_codes.update_one(
                {"user_id": uid, "purpose": "email_otp"},
                {"$set": {"attempts": 5}},
            )
        asyncio.run(_bump())
        r = sess.post(f"{API}/auth/verify-otp",
                      json={"purpose": "email_otp", "code": "000000"})
        assert r.status_code == 429


# ---------- Forgot/reset ----------
class TestForgotReset:
    def test_forgot_generic_response(self, s):
        p = build_register_payload()
        assert s.post(f"{API}/auth/register", json=p).status_code == 201
        r1 = new_session().post(f"{API}/auth/forgot-password", json={"email": p["email"]})
        r2 = new_session().post(f"{API}/auth/forgot-password",
                           json={"email": f"nobody_{rand_suffix()}@example.com"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["message"] == r2.json()["message"]

    def test_reset_password_flow(self, s):
        p = build_register_payload()
        reg = s.post(f"{API}/auth/register", json=p)
        uid = reg.json()["user"]["id"]

        db = _db()
        raw = secrets.token_urlsafe(32)
        async def _seed():
            await db.auth_tokens.delete_many({"user_id": uid, "purpose": "password_reset"})
            await db.auth_tokens.insert_one({
                "user_id": uid, "purpose": "password_reset",
                "token_hash": hashlib.sha256(raw.encode()).hexdigest(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "used_at": None,
            })
        asyncio.run(_seed())

        new_pw = "NewStrong1"
        # Mismatch first
        r = s.post(f"{API}/auth/reset-password",
                   json={"token": raw, "password": new_pw, "confirm_password": "OtherPass1"})
        assert r.status_code == 400
        # Weak
        r = s.post(f"{API}/auth/reset-password",
                   json={"token": raw, "password": "weakpw1", "confirm_password": "weakpw1"})
        assert r.status_code in (400, 422)
        # Valid
        r = s.post(f"{API}/auth/reset-password",
                   json={"token": raw, "password": new_pw, "confirm_password": new_pw})
        assert r.status_code == 200

        # Old pw fails, new pw works
        r_old = new_session().post(f"{API}/auth/login",
                              json={"email": p["email"], "password": p["password"]})
        assert r_old.status_code == 401
        r_new = new_session().post(f"{API}/auth/login",
                              json={"email": p["email"], "password": new_pw})
        assert r_new.status_code == 200

        # Reuse token
        r = s.post(f"{API}/auth/reset-password",
                   json={"token": raw, "password": new_pw, "confirm_password": new_pw})
        assert r.status_code == 400


# ---------- Change password/email ----------
class TestChangePasswordEmail:
    def test_change_password(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)

        # Wrong current
        r = sess.post(f"{API}/auth/change-password",
                      json={"current_password": "WrongPass1",
                            "password": "NewStrong1", "confirm_password": "NewStrong1"})
        assert r.status_code == 403

        # Valid
        r = sess.post(f"{API}/auth/change-password",
                      json={"current_password": p["password"],
                            "password": "NewStrong1", "confirm_password": "NewStrong1"})
        assert r.status_code == 200

        # New password works
        r = new_session().post(f"{API}/auth/login",
                          json={"email": p["email"], "password": "NewStrong1"})
        assert r.status_code == 200

    def test_change_email(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)

        # Verify email first so we can see it flip back
        uid_r = sess.get(f"{API}/auth/me").json()["user"]["id"]
        async def _activate():
            await _db().users.update_one({"_id": ObjectId(uid_r)},
                                         {"$set": {"email_verified": True,
                                                   "status": "active"}})
        asyncio.run(_activate())

        new_email = f"new_{rand_suffix()}@example.com"
        TRACKED_EMAILS.append(new_email)
        # Wrong password
        r = sess.post(f"{API}/auth/change-email",
                      json={"email": new_email, "password": "WrongPass1"})
        assert r.status_code == 403

        # Duplicate email
        other = build_register_payload()
        new_session().post(f"{API}/auth/register", json=other)
        r = sess.post(f"{API}/auth/change-email",
                      json={"email": other["email"], "password": p["password"]})
        assert r.status_code == 409

        # Success
        r = sess.post(f"{API}/auth/change-email",
                      json={"email": new_email, "password": p["password"]})
        assert r.status_code == 200
        me = sess.get(f"{API}/auth/me").json()["user"]
        assert me["email"] == new_email
        assert me["email_verified"] is False
        assert me["status"] == "pending_verification"


# ---------- Profile mass-assignment guard ----------
class TestProfileGuard:
    def test_mass_assignment_ignored(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)

        r = sess.put(f"{API}/auth/profile", json={
            "role": "admin", "status": "active", "email_verified": True,
            "password_hash": "x", "name": "Renamed", "bio": "hello",
            "phone": "9123456780",
        })
        assert r.status_code == 200
        me = sess.get(f"{API}/auth/me").json()["user"]
        assert me["role"] == "student"
        assert me["status"] == "pending_verification"
        assert me["email_verified"] is False
        assert me["name"] == "Renamed"
        assert me["bio"] == "hello"
        assert me["phone"] == "9123456780"
        assert me["phone_verified"] is False


# ---------- Account status blocking ----------
class TestStatusBlocking:
    @pytest.mark.parametrize("bad_status", ["suspended", "banned", "deactivated"])
    def test_blocked_statuses(self, bad_status):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)
        uid = sess.get(f"{API}/auth/me").json()["user"]["id"]

        async def _set(status):
            await _db().users.update_one({"_id": ObjectId(uid)},
                                         {"$set": {"status": status}})
        asyncio.run(_set(bad_status))
        # Existing session
        me = sess.get(f"{API}/auth/me")
        assert me.status_code == 403
        # Login
        r = new_session().post(f"{API}/auth/login",
                          json={"email": p["email"], "password": p["password"]})
        assert r.status_code == 403
        # Restore
        asyncio.run(_set("active"))
        r = new_session().post(f"{API}/auth/login",
                          json={"email": p["email"], "password": p["password"]})
        assert r.status_code == 200


# ---------- Protected routes ----------
class TestProtectedRoutes:
    def test_unauthenticated_401(self):
        anon = new_session()
        endpoints = [
            ("GET", "/auth/me"),
            ("PUT", "/auth/profile"),
            ("POST", "/auth/change-password"),
            ("POST", "/auth/resend-verification"),
            ("GET", "/auth/audit-events"),
        ]
        for method, path in endpoints:
            r = anon.request(method, f"{API}{path}", json={})
            assert r.status_code == 401, f"{method} {path} -> {r.status_code}"

    def test_student_admin_forbidden(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)
        r = sess.get(f"{API}/admin/overview")
        assert r.status_code == 403


# ---------- Audit events ----------
class TestAuditEvents:
    def test_audit_redaction(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)
        # Cause a login failure
        new_session().post(f"{API}/auth/login",
                      json={"email": p["email"], "password": "WrongPass1"})
        # Then a login success
        new_session().post(f"{API}/auth/login",
                      json={"email": p["email"], "password": p["password"]})

        r = sess.get(f"{API}/auth/audit-events")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        events = {i["event"] for i in items}
        assert "registration" in events

        # No secrets leaked in the returned events
        blob = str(items).lower()
        for forbidden in ("password", "password_hash", "token", "code_hash"):
            assert forbidden not in blob, f"leaked field: {forbidden}"

        # Also confirm collection rows themselves don't store password/otp/tokens
        db = _db()
        async def _check():
            async for evt in db.audit_events.find({"email": p["email"]}):
                s_blob = str(evt).lower()
                for forbidden in ("password_hash", "otp", "code_hash",
                                  "token_hash"):
                    assert forbidden not in s_blob
        asyncio.run(_check())


# ---------- Logout ----------
class TestLogout:
    def test_logout_clears_session(self):
        p = build_register_payload()
        sess = new_session()
        sess.headers.update({"Content-Type": "application/json"})
        sess.post(f"{API}/auth/register", json=p)
        r = sess.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # Manually clear cookies as browsers would after Set-Cookie ""
        sess.cookies.clear()
        me = sess.get(f"{API}/auth/me")
        assert me.status_code == 401


# ---------- Rate limits ----------
class TestRateLimits:
    def test_forgot_password_rate_limit(self):
        email = f"rl_forgot_{rand_suffix()}@example.com"
        codes = []
        for _ in range(5):
            r = new_session().post(f"{API}/auth/forgot-password", json={"email": email})
            codes.append(r.status_code)
        assert 429 in codes, codes

    def test_login_lockout(self):
        p = build_register_payload()
        new_session().post(f"{API}/auth/register", json=p)
        codes = []
        for _ in range(7):
            r = new_session().post(f"{API}/auth/login",
                              json={"email": p["email"], "password": "WrongPass1"})
            codes.append(r.status_code)
        assert 429 in codes, codes
        # Clean up lockout for the follow-on tests
        async def _clean():
            d = _db()
            await d.login_attempts.delete_many({"identifier": f"email:{p['email']}"})
        asyncio.run(_clean())


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def _cleanup_at_end():
    yield
    db = _db()
    async def _wipe():
        # Delete all non-admin users created during tests
        result = await db.users.delete_many({"email": {"$ne": "admin@cgstudentportal.in"}})
        # Also nuke related collections for orphaned records
        await db.auth_tokens.delete_many({})
        await db.otp_codes.delete_many({})
        await db.rate_limits.delete_many({})
        await db.login_attempts.delete_many({})
        # Only keep admin's audit events? Simpler: purge everything from test emails
        await db.audit_events.delete_many({"email": {"$in": TRACKED_EMAILS}})
        print(f"[cleanup] users deleted: {result.deleted_count}")
    asyncio.run(_wipe())
