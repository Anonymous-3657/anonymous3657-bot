"""Extra regression covering the brute-force lockout fix + token-body removal."""
import asyncio
import os
import uuid

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = "admin@cgstudentportal.in"
ADMIN_PASSWORD = "CgAdmin@2026"

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")


def _login(email, password, session=None):
    s = session or requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return s, r


def _clear_attempts(identifier):
    async def run():
        # Read the same env the backend does
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        await db.login_attempts.delete_one({"identifier": identifier})
        client.close()
    asyncio.run(run())


def _get_attempts(identifier):
    async def run():
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        docs = await db.login_attempts.find({"identifier": identifier}).to_list(10)
        client.close()
        return docs
    return asyncio.run(run())


class TestTokenBodyRemoved:
    def test_login_response_has_no_access_token(self):
        _, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" not in data
        assert "refresh_token" not in data
        assert "user" in data

    def test_refresh_response_has_no_access_token(self):
        s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/refresh")
        assert r2.status_code == 200
        data = r2.json()
        assert "access_token" not in data
        assert "refresh_token" not in data
        assert "user" in data and data["user"]["email"] == ADMIN_EMAIL
        # Cookies were rotated
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 200


class TestLockoutBehaviour:
    def test_lockout_engages_at_6th_attempt(self):
        throwaway = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
        identifier = f"email:{throwaway.lower()}"
        _clear_attempts(identifier)
        codes = []
        for _ in range(6):
            r = requests.post(f"{API}/auth/login",
                              json={"email": throwaway, "password": "wrong"})
            codes.append(r.status_code)
        assert codes[:5] == [401]*5, codes
        assert codes[5] == 429, codes
        # Message readable
        msg = requests.post(f"{API}/auth/login",
                            json={"email": throwaway, "password": "wrong"}).json()
        assert isinstance(msg.get("detail"), str) and len(msg["detail"]) > 10
        # Only ONE login_attempts doc per email, keyed on email:
        docs = _get_attempts(identifier)
        assert len(docs) == 1, docs
        assert docs[0]["identifier"] == identifier
        _clear_attempts(identifier)

    def test_lockout_does_not_lock_admin(self):
        throwaway = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
        identifier = f"email:{throwaway.lower()}"
        _clear_attempts(identifier)
        for _ in range(6):
            requests.post(f"{API}/auth/login",
                          json={"email": throwaway, "password": "wrong"})
        # Admin still able to log in
        _, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        _clear_attempts(identifier)

    def test_success_clears_failure_counter(self):
        # Fail 3 times, then log in correctly, verify counter doc removed.
        email = ADMIN_EMAIL
        identifier = f"email:{email.lower()}"
        _clear_attempts(identifier)
        for _ in range(3):
            r = requests.post(f"{API}/auth/login",
                              json={"email": email, "password": "wrong"})
            assert r.status_code == 401
        docs_before = _get_attempts(identifier)
        assert len(docs_before) == 1
        assert docs_before[0]["count"] == 3

        _, r = _login(email, ADMIN_PASSWORD)
        assert r.status_code == 200

        docs_after = _get_attempts(identifier)
        assert docs_after == [], f"counter should be cleared, got {docs_after}"

        # And further login still works
        _, r2 = _login(email, ADMIN_PASSWORD)
        assert r2.status_code == 200


class TestSessionRidesOnCookies:
    def test_admin_flow_via_cookies_only(self):
        s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        # No Authorization header — session must ride on cookies.
        assert "Authorization" not in s.headers
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        ov = s.get(f"{API}/admin/overview")
        assert ov.status_code == 200
        assert ov.json()["role"] == "admin"
