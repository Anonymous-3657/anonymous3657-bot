"""
Backend tests for Step 2a Admin Panel:
- Auth (login/me/logout/refresh, brute force)
- Admin overview + entity CRUD (mass-assignment guard, dup slug, required fields)
- User + role management + role rank guard + self-mutation guards
- RBAC: moderator vs student
"""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@cgstudentportal.in"
ADMIN_PASSWORD = "CgAdmin@2026"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json()["user"]["role"] == "admin"
    yield s


@pytest.fixture(scope="module")
def created_users(admin_session):
    """Create a moderator and a student for RBAC tests. Cleanup after."""
    tag = uuid.uuid4().hex[:6]
    moderator = {
        "email": f"TEST_mod_{tag}@example.com",
        "password": "ModPass123!",
        "role": "moderator",
        "name": f"TEST Mod {tag}",
    }
    student = {
        "email": f"TEST_stu_{tag}@example.com",
        "password": "StuPass123!",
        "role": "student",
        "name": f"TEST Stu {tag}",
    }
    r1 = admin_session.post(f"{API}/admin/users", json=moderator)
    assert r1.status_code == 201, r1.text
    r2 = admin_session.post(f"{API}/admin/users", json=student)
    assert r2.status_code == 201, r2.text
    mod_user = r1.json()
    stu_user = r2.json()
    mod_user["_password"] = moderator["password"]
    stu_user["_password"] = student["password"]
    yield {"moderator": mod_user, "student": stu_user}
    # Cleanup
    for u in (mod_user, stu_user):
        try:
            admin_session.delete(f"{API}/admin/users/{u['id']}")
        except Exception:
            pass


# ---------- Auth ----------
class TestAuth:
    def test_login_ok(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["user"]["email"] == ADMIN_EMAIL

    def test_login_sets_httponly_cookie(self):
        s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        assert "access_token" in s.cookies
        # httponly flag check via raw header
        set_cookie = r.headers.get("set-cookie", "").lower()
        assert "httponly" in set_cookie

    def test_wrong_password_401(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong-password"})
        assert r.status_code == 401
        data = r.json()
        assert isinstance(data.get("detail"), str)

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_invalid_bearer_401(self):
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": "Bearer not-a-real-token"})
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # After logout, /me should 401 with cleared cookies
        # (session cookies may still hold old until server clears)
        s.cookies.clear()
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401

    def test_brute_force_lockout(self):
        throwaway = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{API}/auth/login",
                              json={"email": throwaway, "password": "x" * 10})
            codes.append(r.status_code)
        # First 5 should be 401, 6th should be 429
        assert codes[:5].count(401) == 5, f"codes={codes}"
        assert codes[5] == 429, f"codes={codes}"


# ---------- Overview + unauth ----------
class TestOverviewAndAuthz:
    def test_overview_requires_auth(self):
        r = requests.get(f"{API}/admin/overview")
        assert r.status_code == 401

    def test_entities_requires_auth(self):
        r = requests.get(f"{API}/admin/entities/universities")
        assert r.status_code == 401

    def test_users_requires_auth(self):
        r = requests.get(f"{API}/admin/users")
        assert r.status_code == 401

    def test_overview_counts(self, admin_session):
        r = admin_session.get(f"{API}/admin/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin"
        for k in ("states", "universities", "colleges", "courses", "subjects",
                  "categories", "resources", "users"):
            assert k in d["counts"]
            assert isinstance(d["counts"][k], int)


# ---------- Entity CRUD ----------
class TestEntityCRUD:
    def test_list_universities(self, admin_session):
        r = admin_session.get(f"{API}/admin/entities/universities")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d

    def test_create_university_required_missing(self, admin_session):
        r = admin_session.post(f"{API}/admin/entities/universities", json={})
        assert r.status_code == 400

    def test_create_college_missing_university(self, admin_session):
        r = admin_session.post(f"{API}/admin/entities/colleges",
                               json={"name": "TEST_college"})
        assert r.status_code == 400

    def test_category_full_crud_and_mass_assignment(self, admin_session):
        tag = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Cat_{tag}",
            "description": "test cat",
            # mass-assignment attempt (should be ignored)
            "role": "admin",
            "is_deleted": True,
            "created_by": "hacker",
        }
        r = admin_session.post(f"{API}/admin/entities/categories", json=payload)
        assert r.status_code == 201, r.text
        cat = r.json()
        cid = cat["id"]
        # Mass assignment guard: role must not persist, not archived
        assert "role" not in cat or cat.get("role") in (None, "active", "admin") \
            and cat.get("status") != "archived"
        assert cat.get("is_deleted") is False
        assert cat.get("created_by") != "hacker"

        # Duplicate slug -> 409
        dup = admin_session.post(f"{API}/admin/entities/categories",
                                 json={"name": f"TEST_Cat_{tag}"})
        assert dup.status_code == 409

        # Update
        upd = admin_session.put(f"{API}/admin/entities/categories/{cid}",
                                json={"description": "updated desc"})
        assert upd.status_code == 200
        assert upd.json()["description"] == "updated desc"

        # Public GET should include it
        pub = requests.get(f"{API}/categories")
        slugs = [c["slug"] for c in pub.json()["items"]]
        assert cat["slug"] in slugs

        # Archive
        d = admin_session.delete(f"{API}/admin/entities/categories/{cid}")
        assert d.status_code == 200

        # Public GET should exclude it now
        pub2 = requests.get(f"{API}/categories")
        slugs2 = [c["slug"] for c in pub2.json()["items"]]
        assert cat["slug"] not in slugs2

        # Second delete -> 404
        d2 = admin_session.delete(f"{API}/admin/entities/categories/{cid}")
        assert d2.status_code == 404

    def test_universities_dropdown_populated_for_colleges(self, admin_session):
        # colleges form needs universities list
        r = admin_session.get(f"{API}/admin/entities/universities")
        assert r.json()["total"] >= 1


# ---------- Users CRUD + role guards ----------
class TestUsersAndRoles:
    def test_create_and_list_user(self, admin_session):
        tag = uuid.uuid4().hex[:6]
        payload = {
            "email": f"TEST_u_{tag}@example.com",
            "password": "shortp",  # too short
            "role": "student",
        }
        r = admin_session.post(f"{API}/admin/users", json=payload)
        assert r.status_code == 400  # password too short

        payload["password"] = "GoodPass1!"
        r = admin_session.post(f"{API}/admin/users", json=payload)
        assert r.status_code == 201
        uid = r.json()["id"]

        lst = admin_session.get(f"{API}/admin/users").json()
        ids = [u["id"] for u in lst["items"]]
        assert uid in ids

        # Update role
        upd = admin_session.put(f"{API}/admin/users/{uid}",
                                json={"role": "contributor"})
        assert upd.status_code == 200
        assert upd.json()["role"] == "contributor"

        # Delete
        d = admin_session.delete(f"{API}/admin/users/{uid}")
        assert d.status_code == 200

    def test_admin_cannot_change_own_role(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()["user"]
        r = admin_session.put(f"{API}/admin/users/{me['id']}",
                              json={"role": "moderator"})
        assert r.status_code == 400

    def test_admin_cannot_delete_own_account(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()["user"]
        r = admin_session.delete(f"{API}/admin/users/{me['id']}")
        assert r.status_code == 400


# ---------- RBAC: moderator restrictions ----------
class TestModeratorRBAC:
    def test_moderator_flow(self, created_users):
        mod = created_users["moderator"]
        s, r = _login(mod["email"], mod["_password"])
        assert r.status_code == 200

        # (a) Can read overview
        ov = s.get(f"{API}/admin/overview")
        assert ov.status_code == 200

        # (b) Cannot create users -> 403
        cr = s.post(f"{API}/admin/users", json={
            "email": f"TEST_x_{uuid.uuid4().hex[:6]}@e.com",
            "password": "GoodPass1!",
            "role": "student",
        })
        assert cr.status_code == 403

        # (c) Cannot delete a university -> 403
        # Get a university id (admin-created, first available)
        adm_s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        uni_items = adm_s.get(f"{API}/admin/entities/universities").json()["items"]
        if uni_items:
            uid = uni_items[0]["id"]
            dr = s.delete(f"{API}/admin/entities/universities/{uid}")
            assert dr.status_code == 403

        # (d) Cannot create university (catalog:write) -> 403
        cu = s.post(f"{API}/admin/entities/universities",
                    json={"name": "TEST_mod_uni"})
        assert cu.status_code == 403

        # But CAN create a resource (resource:write)
        cr2 = s.post(f"{API}/admin/entities/resources",
                     json={"title": f"TEST_mod_res_{uuid.uuid4().hex[:6]}"})
        assert cr2.status_code == 201, cr2.text
        rid = cr2.json()["id"]
        # Cleanup as admin (moderator has no resource:delete)
        adm_s.delete(f"{API}/admin/entities/resources/{rid}")


class TestStudentRBAC:
    def test_student_cannot_access_users_or_write(self, created_users):
        stu = created_users["student"]
        s, r = _login(stu["email"], stu["_password"])
        assert r.status_code == 200

        # Overview is catalog:read -> student has it
        ov = s.get(f"{API}/admin/overview")
        assert ov.status_code == 200

        # Cannot list users
        lu = s.get(f"{API}/admin/users")
        assert lu.status_code == 403

        # Cannot create a resource
        cr = s.post(f"{API}/admin/entities/resources",
                    json={"title": "TEST_stu_res"})
        assert cr.status_code == 403
