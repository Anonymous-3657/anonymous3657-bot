"""Step 4 smoke test: college master, registration with college, PDF upload,
admin review, secure download and AI PDF summary."""
import io
import os
import random
import sys

import requests

API = os.environ["API"] + "/api"
ADMIN = ("admin@cgstudentportal.in", "CgAdmin@2026")
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"PASS {name}")
    else:
        fail += 1
        print(f"FAIL {name} {extra}")


def make_pdf(text: str) -> bytes:
    body = f"BT /F1 12 Tf 40 750 Td ({text}) Tj ET"
    objs = [
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]"
        "/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj",
        f"4 0 obj<</Length {len(body)}>>stream\n{body}\nendstream endobj",
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    ]
    out = "%PDF-1.4\n"
    offsets = []
    for o in objs:
        offsets.append(len(out))
        out += o + "\n"
    start = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n"
    out += (f"trailer<</Size {len(objs) + 1}/Root 1 0 R>>\nstartxref\n{start}\n%%EOF")
    return out.encode("latin-1")


student = requests.Session()
admin = requests.Session()

# 1. College master list
master = requests.get(f"{API}/colleges/master", params={"limit": 300}).json()
check("158 colleges seeded", master["total"] == 158, master["total"])
check("7 districts", len(master["districts"]) == 7, master["districts"])
codes = [c["college_code"] for c in master["items"]]
check("college codes unique", len(codes) == len(set(codes)))
search = requests.get(f"{API}/colleges/master", params={"q": "301"}).json()
check("search by code", search["total"] == 1 and search["items"][0]["college_code"] == 301)

# 2. Registration requires a valid college
suffix = random.randint(100000, 999999)
email = f"step4tester{suffix}@example.com"
uni = requests.get(f"{API}/universities").json()["items"][0]["id"]
course = requests.get(f"{API}/courses", params={"university_id": uni}).json()["items"][0]["id"]
payload = {
    "name": "Step Four Tester",
    "username": f"step4_{suffix}",
    "email": email,
    "phone": "9876543210",
    "password": "StrongPass1",
    "confirm_password": "StrongPass1",
    "university_id": uni,
    "course_id": course,
    "semester_or_year": "Semester 3",
    "college_code": 301,
    "accept_terms": True,
    "accept_privacy": True,
}
bad = student.post(f"{API}/auth/register", json={**payload, "college_code": 9999})
check("invalid college rejected", bad.status_code == 400, bad.text[:120])

reg = student.post(f"{API}/auth/register", json=payload)
check("registration with college", reg.status_code == 201, reg.text[:200])
if reg.status_code != 201:
    sys.exit(1)
user = reg.json()["user"]
check("college stored on profile",
      user["college_code"] == 301 and user["district"] == "DURG" and user["college_name"],
      user.get("college_name"))

# 3. PDF upload
pdf = make_pdf(
    "UNIT 1 DATABASE MANAGEMENT SYSTEMS. A database is an organised collection of data. "
    "Normalisation removes redundancy. First normal form requires atomic attributes. "
    "Second normal form removes partial dependency. Third normal form removes transitive "
    "dependency. ACID properties are atomicity consistency isolation and durability. "
    "A primary key uniquely identifies each row of a relation in the database schema."
)
files = {"file": ("dbms-notes.pdf", io.BytesIO(pdf), "application/pdf")}
form = {"title": "DBMS Unit 1 Notes", "subject": "DBMS", "semester": "Semester 3",
        "session": "2025-26", "description": "Smoke test upload"}
up = student.post(f"{API}/pdfs", files=files, data=form)
check("pdf upload", up.status_code == 201, up.text[:200])
if up.status_code != 201:
    sys.exit(1)
pdf_id = up.json()["id"]
check("upload starts pending", up.json()["status"] == "pending")

files = {"file": ("dbms-notes.pdf", io.BytesIO(pdf), "application/pdf")}
dup = student.post(f"{API}/pdfs", files=files, data=form)
check("duplicate blocked", dup.status_code == 409, dup.status_code)

files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
bad_type = student.post(f"{API}/pdfs", files=files, data=form)
check("non-pdf blocked", bad_type.status_code == 400, bad_type.status_code)

files = {"file": ("fake.pdf", io.BytesIO(b"not really a pdf"), "application/pdf")}
bad_magic = student.post(f"{API}/pdfs", files=files, data=form)
check("fake pdf blocked", bad_magic.status_code == 400, bad_magic.status_code)

# 4. Student cannot approve, and it is not public yet
selfapprove = student.post(f"{API}/admin/pdfs/{pdf_id}/approve")
check("student cannot approve", selfapprove.status_code == 403, selfapprove.status_code)
check("not in approved list yet",
      pdf_id not in [p["id"] for p in requests.get(f"{API}/pdfs/approved").json()["items"]])
own_file = student.get(f"{API}/pdfs/{pdf_id}/file")
check("owner can read own file", own_file.status_code == 200 and own_file.content[:4] == b"%PDF")
check("file needs auth", requests.get(f"{API}/pdfs/{pdf_id}/file").status_code == 401)

# 5. AI summary of own pending PDF
summary = student.post(f"{API}/ai/pdf-summary", json={"pdf_id": pdf_id, "mode": "exam_notes"})
check("ai pdf summary", summary.status_code == 200, summary.text[:200])
if summary.status_code == 200:
    check("summary not empty", len(summary.json()["summary"]) > 80)

files = {"file": ("scan.pdf", io.BytesIO(make_pdf("x")), "application/pdf")}
scan = student.post(f"{API}/pdfs", files=files,
                    data={**form, "title": "Scanned looking pdf"})
if scan.status_code == 201:
    r = student.post(f"{API}/ai/pdf-summary",
                     json={"pdf_id": scan.json()["id"], "mode": "short"})
    check("no-text pdf gives clear error", r.status_code == 422, r.status_code)

# 6. Admin review
login = admin.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
check("admin login", login.status_code == 200, login.text[:120])
queue = admin.get(f"{API}/admin/pdfs", params={"status": "pending"}).json()
check("pdf in admin queue", pdf_id in [p["id"] for p in queue["items"]])
check("queue exposes uploader", any(p["id"] == pdf_id and p["uploader_email"] == email
                                    for p in queue["items"]))

rej = admin.post(f"{API}/admin/pdfs/{pdf_id}/reject", json={"reason": "Pages 4-6 unreadable"})
check("reject with reason", rej.status_code == 200 and rej.json()["status"] == "rejected",
      rej.text[:150])
check("reject needs a reason",
      admin.post(f"{API}/admin/pdfs/{pdf_id}/reject", json={"reason": "no"}).status_code == 422)
appr = admin.post(f"{API}/admin/pdfs/{pdf_id}/approve")
check("approve", appr.status_code == 200 and appr.json()["status"] == "approved", appr.text[:150])
check("now public", pdf_id in [p["id"] for p in
                               requests.get(f"{API}/pdfs/approved").json()["items"]])

# 7. Bookmarks (PDF)
bm = student.post(f"{API}/me/bookmarks", json={"pdf_id": pdf_id})
check("bookmark pdf", bm.status_code == 201, bm.text[:150])
check("pdf on shelf", pdf_id in [p["id"] for p in
                                 student.get(f"{API}/me/bookmarks/pdfs").json()["items"]])
check("bookmark ids include pdf",
      pdf_id in student.get(f"{API}/me/bookmarks/ids").json()["ids"])
check("remove bookmark", student.delete(f"{API}/me/bookmarks/{pdf_id}").status_code == 200)

# 8. Exam schedule + countdown
countdown = student.get(f"{API}/me/exam-countdown").json()
check("countdown unscheduled by default", countdown["state"] == "unscheduled", countdown)
from datetime import date, timedelta  # noqa: E402
start = (date.today() + timedelta(days=27)).isoformat()
created = admin.post(f"{API}/admin/entities/exam_schedules", json={
    "course_id": course, "semester": "Semester 3", "exam_type": "Main",
    "session": "2025-26", "start_date": start,
    "end_date": (date.today() + timedelta(days=35)).isoformat(),
})
check("admin creates exam schedule", created.status_code == 201, created.text[:150])
countdown = student.get(f"{API}/me/exam-countdown").json()
check("countdown 27 days", countdown.get("days_left") == 27 and countdown["state"] == "upcoming",
      countdown)
if created.status_code == 201:
    admin.delete(f"{API}/admin/entities/exam_schedules/{created.json()['id']}")

# 9. Admin college management
cols = admin.get(f"{API}/admin/entities/colleges",
                 params={"district": "KABIRDHAM", "college_type": "G", "limit": 200}).json()
expected = requests.get(f"{API}/colleges/master",
                        params={"district": "KABIRDHAM", "college_type": "G",
                                "limit": 300}).json()["total"]
check("admin college filters", cols["total"] == expected and cols["total"] > 0,
      (cols["total"], expected))
first = cols["items"][0]
off = admin.put(f"{API}/admin/entities/colleges/{first['id']}", json={"is_active": False})
check("deactivate college", off.status_code == 200 and off.json()["is_active"] is False)
check("inactive college hidden from master",
      first["college_code"] not in [c["college_code"] for c in
                                    requests.get(f"{API}/colleges/master",
                                                 params={"limit": 300}).json()["items"]])
admin.put(f"{API}/admin/entities/colleges/{first['id']}", json={"is_active": True})

# 10. Cleanup
admin.delete(f"{API}/admin/pdfs/{pdf_id}")
print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
