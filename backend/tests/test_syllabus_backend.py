import asyncio

from fastapi.testclient import TestClient

from auth import create_access_token
from database import db
from server import app


client = TestClient(app)


def _admin_token():
    admin = asyncio.run(db.users.find_one({"role": {"$in": ["admin", "super_admin"]}}))
    assert admin, "No admin account exists for syllabus tests"
    return create_access_token(str(admin["_id"]), admin["email"])


def test_admin_syllabus_upload_duplicate_and_public_listing():
    token = _admin_token()
    pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    data = {
        "category": "UG",
        "course": "BCA",
        "year": "1st Year",
        "semester": "Semester 1",
        "subject_name": "Computer Fundamentals",
        "subject_code": "BCA-101",
        "syllabus_title": "Computer Fundamentals Syllabus",
        "academic_session": "2026-27",
        "description": "Foundation syllabus",
        "status": "published",
    }
    res = client.post(
        "/api/admin/syllabus",
        files={"file": ("computer-fundamentals.pdf", pdf, "application/pdf")},
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201, res.text
    created = res.json()
    assert created["subject_name"] == "Computer Fundamentals"

    dup = client.post(
        "/api/admin/syllabus",
        files={"file": ("computer-fundamentals.pdf", pdf, "application/pdf")},
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup.status_code == 409, dup.text

    public = client.get("/api/syllabus")
    assert public.status_code == 200, public.text
    ids = [item["id"] for item in public.json()["items"]]
    assert created["id"] in ids

    client.delete(
        f"/api/admin/syllabus/{created['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
