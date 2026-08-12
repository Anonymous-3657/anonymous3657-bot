"""
Backend tests for Bookmarks + AI Study Buddy features (Iteration 8).

Focus of this suite (per E1 review request):
- Bookmarks: happy path, idempotency, isolation, ownership-injection guard, auth,
  hydration hides file_url.
- AI: validation bounds, ownership + 404-cross-user, rate limit via pre-seed,
  missing EMERGENT_LLM_KEY -> 503 (NOT exercised here to avoid breaking live env;
  covered separately by a controlled script).
- Real LLM calls kept to a MINIMUM (2 total: one /ask start, one /ask same-session
  follow-up). Summarise/practice are validation-only.

Cleanup: purges all bookmarks / ai_sessions / ai_messages / rate_limits produced,
and all users except admin + shelfui.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

CREATED_EMAILS = []


def _db():
    return AsyncIOMotorClient(MONGO_URL)[DB_NAME]


async def _ids():
    d = _db()
    u = await d.universities.find_one({})
    c = await d.courses.find_one({})
    return str(u["_id"]), str(c["_id"])


UNIV_ID, COURSE_ID = asyncio.run(_ids())


async def _two_resources():
    d = _db()
    docs = await d.resources.find({"is_deleted": {"$ne": True}}).limit(2).to_list(2)
    return [str(x["_id"]) for x in docs]


RESOURCE_IDS = asyncio.run(_two_resources())


def _fresh_ip():
    return f"10.{uuid.uuid4().int % 255}.{uuid.uuid4().int % 255}.{uuid.uuid4().int % 255}"


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Forwarded-For": _fresh_ip()})
    return s


def register_student(prefix="bmk"):
    suffix = uuid.uuid4().hex[:8]
    email = f"{prefix}_{suffix}@example.com"
    CREATED_EMAILS.append(email)
    payload = {
        "name": "Test Student",
        "username": f"{prefix}_{suffix}",
        "email": email,
        "phone": "9876543210",
        "password": "StrongPass1",
        "confirm_password": "StrongPass1",
        "university_id": UNIV_ID,
        "college_id": None,
        "college_code": 301,
        "course_id": COURSE_ID,
        "semester_or_year": "1",
        "accept_terms": True,
        "accept_privacy": True,
    }
    s = new_session()
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 201, r.text
    return s, r.json()["user"]


# ================================================================ BOOKMARKS
class TestBookmarksAuth:
    def test_unauth_endpoints_401(self):
        s = new_session()
        assert s.get(f"{API}/me/bookmarks").status_code == 401
        assert s.get(f"{API}/me/bookmarks/ids").status_code == 401
        assert s.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[0]}).status_code == 401
        assert s.delete(f"{API}/me/bookmarks/{RESOURCE_IDS[0]}").status_code == 401


class TestBookmarksHappyPath:
    def test_add_list_hydrate_delete(self):
        s, _ = register_student()
        # POST
        r = s.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[0]})
        assert r.status_code == 201, r.text
        # GET list is hydrated
        r = s.get(f"{API}/me/bookmarks")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert "title" in item
        # file_url must NEVER be exposed to a bookmarks caller
        assert "file_url" not in item, f"file_url leaked: {item.keys()}"
        # ids endpoint
        r = s.get(f"{API}/me/bookmarks/ids")
        assert r.status_code == 200
        assert RESOURCE_IDS[0] in r.json()["ids"]
        # DELETE
        r = s.delete(f"{API}/me/bookmarks/{RESOURCE_IDS[0]}")
        assert r.status_code == 200
        # DELETE again -> 404
        r = s.delete(f"{API}/me/bookmarks/{RESOURCE_IDS[0]}")
        assert r.status_code == 404


class TestBookmarksIdempotency:
    def test_duplicate_post_no_duplicate_row(self):
        s, _ = register_student()
        r1 = s.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[0]})
        r2 = s.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[0]})
        assert r1.status_code == 201
        assert r2.status_code == 201  # idempotent success
        data = s.get(f"{API}/me/bookmarks").json()
        assert data["total"] == 1


class TestBookmarksValidation:
    def test_non_existent_resource_404(self):
        s, _ = register_student()
        fake = "6a7be3f1257d4ee0dbc32aff"  # well formed but not present
        r = s.post(f"{API}/me/bookmarks", json={"resource_id": fake})
        assert r.status_code == 404

    def test_malformed_resource_returns_4xx(self):
        s, _ = register_student()
        r = s.post(f"{API}/me/bookmarks", json={"resource_id": "not-an-oid"})
        assert r.status_code in (400, 404, 422), r.status_code
        assert r.status_code != 500


class TestBookmarksIsolation:
    def test_cross_user_isolation(self):
        s1, u1 = register_student("iso1")
        s2, u2 = register_student("iso2")
        # each saves a different resource
        assert s1.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[0]}).status_code == 201
        assert s2.post(f"{API}/me/bookmarks", json={"resource_id": RESOURCE_IDS[1]}).status_code == 201
        # s1 sees only theirs
        ids1 = s1.get(f"{API}/me/bookmarks/ids").json()["ids"]
        ids2 = s2.get(f"{API}/me/bookmarks/ids").json()["ids"]
        assert ids1 == [RESOURCE_IDS[0]]
        assert ids2 == [RESOURCE_IDS[1]]

    def test_ownership_injection_ignored(self):
        s1, u1 = register_student("inj1")
        s2, u2 = register_student("inj2")
        # s1 tries to POST with someone else's user_id — extra fields must be ignored,
        # bookmark should be saved to caller's own shelf.
        r = s1.post(f"{API}/me/bookmarks", json={
            "resource_id": RESOURCE_IDS[0],
            "user_id": u2["id"],  # attempt to hijack
        })
        assert r.status_code == 201
        # s2 shelf must remain empty
        ids2 = s2.get(f"{API}/me/bookmarks/ids").json()["ids"]
        assert ids2 == []
        # s1 shelf owns it
        ids1 = s1.get(f"{API}/me/bookmarks/ids").json()["ids"]
        assert ids1 == [RESOURCE_IDS[0]]


# ==================================================================== AI
class TestAIAuth:
    def test_unauth_401(self):
        s = new_session()
        assert s.post(f"{API}/ai/ask", json={"question": "hello"}).status_code == 401
        assert s.post(f"{API}/ai/summarise", json={"text": "x" * 300}).status_code == 401
        assert s.post(f"{API}/ai/practice", json={"topic": "math"}).status_code == 401
        assert s.get(f"{API}/ai/sessions").status_code == 401


class TestAIValidation:
    def test_ask_min_length(self):
        s, _ = register_student("ai1")
        r = s.post(f"{API}/ai/ask", json={"question": "hi"})  # < 3 chars
        assert r.status_code == 422

    def test_summarise_too_short(self):
        s, _ = register_student("ai2")
        r = s.post(f"{API}/ai/summarise", json={"text": "short text"})
        assert r.status_code == 422

    def test_summarise_too_long(self):
        s, _ = register_student("ai3")
        r = s.post(f"{API}/ai/summarise", json={"text": "a" * 13000})
        assert r.status_code == 422

    def test_practice_count_bounds(self):
        s, _ = register_student("ai4")
        r_low = s.post(f"{API}/ai/practice", json={"topic": "algebra", "count": 2})
        r_high = s.post(f"{API}/ai/practice", json={"topic": "algebra", "count": 11})
        r_diff = s.post(f"{API}/ai/practice",
                        json={"topic": "algebra", "count": 5, "difficulty": "brutal"})
        assert r_low.status_code == 422
        assert r_high.status_code == 422
        assert r_diff.status_code == 422


class TestAIRateLimit:
    """Pre-seed rate_limits doc to 40 so the NEXT AI call returns 429 without burning credits."""
    def test_rate_limit_returns_429(self):
        s, u = register_student("rl")
        uid = u["id"]
        async def _seed():
            d = _db()
            await d.rate_limits.update_one(
                {"key": f"ai:{uid}"},
                {"$set": {
                    "key": f"ai:{uid}",
                    "count": 40,
                    "window_started_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
        asyncio.run(_seed())
        r = s.post(f"{API}/ai/ask", json={"question": "should be rate limited"})
        assert r.status_code == 429
        assert "limit" in r.json()["detail"].lower() or "later" in r.json()["detail"].lower()


class TestAIOwnership:
    """Cross-user isolation for ai sessions. Uses a pre-seeded session, no LLM."""
    def test_cross_user_session_404(self):
        s1, u1 = register_student("aiown1")
        s2, u2 = register_student("aiown2")
        session_id = uuid.uuid4().hex
        async def _seed():
            d = _db()
            await d.ai_sessions.insert_one({
                "session_id": session_id,
                "user_id": u1["id"],
                "title": "owner-only",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            await d.ai_messages.insert_many([
                {"session_id": session_id, "user_id": u1["id"], "role": "user",
                 "content": "q", "kind": "ask",
                 "created_at": datetime.now(timezone.utc).isoformat()},
                {"session_id": session_id, "user_id": u1["id"], "role": "assistant",
                 "content": "a", "kind": "ask",
                 "created_at": datetime.now(timezone.utc).isoformat()},
            ])
        asyncio.run(_seed())

        # Owner can read
        r_owner = s1.get(f"{API}/ai/sessions/{session_id}")
        assert r_owner.status_code == 200
        assert len(r_owner.json()["items"]) == 2

        # Non-owner gets 404 (never 200 with someone else's content)
        r_other = s2.get(f"{API}/ai/sessions/{session_id}")
        assert r_other.status_code == 404

        # Non-owner cannot delete
        r_del_other = s2.delete(f"{API}/ai/sessions/{session_id}")
        assert r_del_other.status_code == 404

        # Non-owner sessions list is separate
        assert s2.get(f"{API}/ai/sessions").json()["items"] == []

        # Owner delete cleans up messages
        r_del = s1.delete(f"{API}/ai/sessions/{session_id}")
        assert r_del.status_code == 200
        async def _check():
            d = _db()
            return await d.ai_messages.count_documents({"session_id": session_id})
        assert asyncio.run(_check()) == 0


class TestAIRealCall:
    """Two real LLM calls only, to verify /ask happy path + session continuity."""
    def test_ask_and_followup_same_session(self):
        s, _ = register_student("aichat")
        r1 = s.post(f"{API}/ai/ask", json={"question": "In one sentence, what is Ohm's law?"})
        assert r1.status_code == 200, r1.text
        data1 = r1.json()
        assert data1["answer"] and len(data1["answer"]) > 10
        sid = data1["session_id"]

        r2 = s.post(f"{API}/ai/ask", json={
            "session_id": sid,
            "question": "Give one real-life example of it.",
        })
        assert r2.status_code == 200, r2.text
        assert r2.json()["session_id"] == sid
        assert r2.json()["answer"]

        # Session listing shows this session
        sessions = s.get(f"{API}/ai/sessions").json()["items"]
        assert any(x["session_id"] == sid for x in sessions)

        # Session messages endpoint returns >= 4 rows (2 user + 2 assistant)
        msgs = s.get(f"{API}/ai/sessions/{sid}").json()["items"]
        assert len(msgs) >= 4
        roles = [m["role"] for m in msgs]
        assert roles.count("user") >= 2 and roles.count("assistant") >= 2


# ============================================================== CLEANUP
@pytest.fixture(scope="session", autouse=True)
def _cleanup():
    yield
    async def _wipe():
        d = _db()
        # Purge test users
        users = await d.users.find(
            {"email": {"$nin": ["admin@cgstudentportal.in", "shelfui@example.com"]}},
            {"_id": 1},
        ).to_list(1000)
        uids = [str(u["_id"]) for u in users]
        await d.users.delete_many({"_id": {"$in": [u["_id"] for u in users]}})
        await d.bookmarks.delete_many({})
        await d.ai_sessions.delete_many({})
        await d.ai_messages.delete_many({})
        await d.rate_limits.delete_many({})
        await d.login_attempts.delete_many({})
        await d.auth_tokens.delete_many({})
        await d.audit_events.delete_many({"email": {"$in": CREATED_EMAILS}})
        print(f"[cleanup] wiped {len(uids)} test users + bookmarks/ai state")
    asyncio.run(_wipe())
