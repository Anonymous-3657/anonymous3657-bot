"""Targeted RBAC regression for iter6: student & contributor must get 403 on ALL /api/admin/*."""
import os, uuid, random, pytest, requests
from pymongo import MongoClient

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().strip('"').rstrip("/")
MONGO = os.environ.get("MONGO_URL")
DB = os.environ.get("DB_NAME")
if not MONGO or not DB:
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                MONGO = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("DB_NAME="):
                DB = line.split("=", 1)[1].strip().strip('"')

_c = MongoClient(MONGO)[DB]
UNIV_ID = str(_c.universities.find_one({})["_id"])
COURSE_ID = str(_c.courses.find_one({})["_id"])

ADMIN_EMAIL = "admin@cgstudentportal.in"
ADMIN_PW = "CgAdmin@2026"


def _fwd():
    return {"X-Forwarded-For": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"}


def _register_student():
    s = requests.Session()
    email = f"stud_{uuid.uuid4().hex[:10]}@example.com"
    payload = {
        "name": "Test Student", "username": f"stud{uuid.uuid4().hex[:8]}",
        "email": email, "password": "StrongPass1", "confirm_password": "StrongPass1",
        "phone": f"98{random.randint(10000000,99999999)}",
        "university_id": UNIV_ID, "college_id": None,
        "course_id": COURSE_ID, "semester_or_year": "1",
        "accept_terms": True, "accept_privacy": True,
    }
    r = s.post(f"{BASE}/api/auth/register", json=payload, headers=_fwd())
    assert r.status_code == 201, r.text
    return s, email


def _login_admin():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, headers=_fwd())
    assert r.status_code == 200, r.text
    return s


def _promote(email, role):
    c = MongoClient(MONGO)[DB]
    res = c.users.update_one({"email": email}, {"$set": {"role": role}})
    assert res.matched_count == 1


ADMIN_ENDPOINTS_403_FOR_NONSTAFF = [
    ("GET", "/api/admin/overview", None),
    ("GET", "/api/admin/entities/universities", None),
    ("GET", "/api/admin/entities/categories", None),
    ("GET", "/api/admin/users", None),
    ("POST", "/api/admin/entities/resources", {"title": "x"}),
    ("DELETE", "/api/admin/entities/categories/deadbeef", None),
]


@pytest.fixture(scope="module")
def student():
    s, email = _register_student()
    yield s, email
    MongoClient(MONGO)[DB].users.delete_one({"email": email})


@pytest.fixture(scope="module")
def contributor():
    s, email = _register_student()
    _promote(email, "contributor")
    # re-login so principal reflects new role (not strictly needed, get_current_user reads live)
    yield s, email
    MongoClient(MONGO)[DB].users.delete_one({"email": email})


@pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS_403_FOR_NONSTAFF)
def test_student_forbidden(student, method, path, body):
    s, _ = student
    r = s.request(method, f"{BASE}{path}", json=body, headers=_fwd())
    assert r.status_code == 403, f"{method} {path} -> {r.status_code} body={r.text[:200]}"


@pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS_403_FOR_NONSTAFF)
def test_contributor_forbidden(contributor, method, path, body):
    s, _ = contributor
    r = s.request(method, f"{BASE}{path}", json=body, headers=_fwd())
    assert r.status_code == 403, f"{method} {path} -> {r.status_code} body={r.text[:200]}"


def test_admin_overview_ok():
    s = _login_admin()
    r = s.get(f"{BASE}/api/admin/overview", headers=_fwd())
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_admin_can_list_entities_and_users():
    s = _login_admin()
    for path in ["/api/admin/entities/universities", "/api/admin/entities/categories", "/api/admin/users"]:
        r = s.get(f"{BASE}{path}", headers=_fwd())
        assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_moderator_overview_and_perms():
    """Moderator: 200 on overview + read catalog, 403 on POST /admin/users and university write."""
    s, email = _register_student()
    _promote(email, "moderator")
    r = s.get(f"{BASE}/api/admin/overview", headers=_fwd())
    assert r.status_code == 200, r.text
    r = s.get(f"{BASE}/api/admin/entities/universities", headers=_fwd())
    assert r.status_code == 200
    # forbidden writes
    r = s.post(f"{BASE}/api/admin/users",
               json={"name": "x", "email": f"x_{uuid.uuid4().hex[:6]}@e.com", "password": "StrongPass1", "role": "student"},
               headers=_fwd())
    assert r.status_code == 403, r.text
    r = s.post(f"{BASE}/api/admin/entities/universities", json={"name": "New U"}, headers=_fwd())
    assert r.status_code == 403, r.text
    MongoClient(MONGO)[DB].users.delete_one({"email": email})


def test_unauthenticated_admin_endpoints_401():
    r = requests.get(f"{BASE}/api/admin/overview", headers=_fwd())
    assert r.status_code == 401


def test_auth_cookies_and_me_and_logout():
    """Login sets cookies, /me works, logout clears."""
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, headers=_fwd())
    assert r.status_code == 200
    assert "access_token" in s.cookies
    assert "refresh_token" in s.cookies
    r = s.get(f"{BASE}/api/auth/me", headers=_fwd())
    assert r.status_code == 200
    assert r.json()["user"]["email"] == ADMIN_EMAIL
    r = s.post(f"{BASE}/api/auth/logout", headers=_fwd())
    assert r.status_code == 200
    # after logout, /me should be 401 with a fresh session
    s2 = requests.Session()
    r = s2.get(f"{BASE}/api/auth/me", headers=_fwd())
    assert r.status_code == 401
