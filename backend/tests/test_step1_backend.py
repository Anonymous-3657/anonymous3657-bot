"""
Backend regression tests for CG STUDENT PORTAL Step 1.
Read-only APIs: meta, catalog, resources. No auth.
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # Fall back to reading frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Meta ----------
class TestMeta:
    def test_health(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_stats(self, s):
        r = s.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("universities", "colleges", "courses", "subjects", "resources"):
            assert k in d and isinstance(d[k], int)
        assert d.get("is_demo_data") is True
        assert d["universities"] >= 1
        assert d["courses"] >= 2
        assert d["resources"] >= 6

    def test_security_headers(self, s):
        r = s.get(f"{API}/health")
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert "Referrer-Policy" in r.headers

    def test_search_min_length(self, s):
        r = s.get(f"{API}/search", params={"q": "a"})
        assert r.status_code == 422

    def test_search_ok(self, s):
        r = s.get(f"{API}/search", params={"q": "data"})
        assert r.status_code == 200
        d = r.json()
        assert "resources" in d and "subjects" in d and "courses" in d

    def test_sitemap(self, s):
        r = s.get(f"{API}/sitemap-entries")
        assert r.status_code == 200
        entries = r.json().get("entries", [])
        prefixes = {e["loc"].split("/")[1] for e in entries}
        for p in ("universities", "courses", "resources"):
            assert p in prefixes


# ---------- Catalog ----------
class TestCatalog:
    def test_universities_list_has_id_not_underscore(self, s):
        r = s.get(f"{API}/universities")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 1
        for item in d["items"]:
            assert "id" in item
            assert "_id" not in item
        slugs = [i["slug"] for i in d["items"]]
        assert "hemchand-yadav-vishwavidyalaya" in slugs

    def test_universities_q_filter(self, s):
        r = s.get(f"{API}/universities", params={"q": "Hemchand"})
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_university_detail(self, s):
        r = s.get(f"{API}/universities/hemchand-yadav-vishwavidyalaya")
        assert r.status_code == 200
        d = r.json()
        assert d["university"]["slug"] == "hemchand-yadav-vishwavidyalaya"
        assert "id" in d["university"] and "_id" not in d["university"]
        assert isinstance(d["courses"], list)
        assert isinstance(d["colleges"], list)
        assert "resource_count" in d

    def test_university_404(self, s):
        r = s.get(f"{API}/universities/no-such-slug")
        assert r.status_code == 404

    def test_courses_list(self, s):
        r = s.get(f"{API}/courses")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 2
        for c in d["items"]:
            assert "id" in c and "_id" not in c

    def test_courses_ug_filter(self, s):
        r = s.get(f"{API}/courses", params={"course_type": "UG"})
        assert r.status_code == 200
        for c in r.json()["items"]:
            assert c["course_type"] == "UG"

    def test_course_detail_bca(self, s):
        r = s.get(f"{API}/courses/bca")
        assert r.status_code == 200
        d = r.json()
        assert d["course"]["slug"] == "bca"
        assert isinstance(d["subjects"], list)
        assert len(d["subjects"]) > 0
        for sub in d["subjects"]:
            assert "id" in sub and "_id" not in sub

    def test_course_404(self, s):
        r = s.get(f"{API}/courses/nope")
        assert r.status_code == 404

    def test_subjects_filter_by_course(self, s):
        courses = s.get(f"{API}/courses").json()["items"]
        cid = courses[0]["id"]
        r = s.get(f"{API}/subjects", params={"course_id": cid})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 1
        for sub in d["items"]:
            assert sub["course_id"] == cid
            assert "id" in sub

    def test_categories(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 6
        for c in d["items"]:
            assert "id" in c and "_id" not in c
            assert c.get("slug")
            assert "icon" in c


# ---------- Resources ----------
class TestResources:
    def test_resources_list(self, s):
        r = s.get(f"{API}/resources")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 6
        for item in d["items"]:
            assert "id" in item and "_id" not in item
            assert "file_url" not in item  # never expose
            # Hydrated names (may be None if relation not set, but keys must exist)
            for k in ("university", "course", "subject", "category"):
                assert k in item

    def test_resources_sort_options(self, s):
        for sort in ("recent", "popular", "downloads"):
            r = s.get(f"{API}/resources", params={"sort": sort})
            assert r.status_code == 200, f"sort={sort} failed: {r.text}"

    def test_resources_invalid_sort(self, s):
        r = s.get(f"{API}/resources", params={"sort": "bogus"})
        assert r.status_code == 422

    def test_resources_q_filter(self, s):
        r = s.get(f"{API}/resources", params={"q": "data"})
        assert r.status_code == 200

    def test_resources_invalid_objectid_returns_400(self, s):
        r = s.get(f"{API}/resources", params={"category_id": "not-an-oid"})
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    def test_resources_filter_by_category(self, s):
        cats = s.get(f"{API}/categories").json()["items"]
        cid = cats[0]["id"]
        r = s.get(f"{API}/resources", params={"category_id": cid})
        assert r.status_code == 200

    def test_resources_pagination(self, s):
        r = s.get(f"{API}/resources", params={"skip": 0, "limit": 3})
        assert r.status_code == 200
        d = r.json()
        assert d["limit"] == 3
        assert len(d["items"]) <= 3

    def test_resource_detail(self, s):
        # Grab first seeded resource slug from list
        first = s.get(f"{API}/resources").json()["items"][0]
        slug = first["slug"]
        r = s.get(f"{API}/resources/{slug}")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == slug
        assert "file_url" not in d
        assert "id" in d

    def test_resource_404(self, s):
        r = s.get(f"{API}/resources/no-such-slug")
        assert r.status_code == 404
