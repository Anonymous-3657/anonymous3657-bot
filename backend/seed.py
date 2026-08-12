"""Development-only seed data. All records are flagged is_demo=True."""
import asyncio

from database import db, ensure_indexes
from models import (Category, College, Course, Permission, Resource, Role,
                    State, Subject, University)

PERMISSIONS = [
    ("resource.view", "View resources"),
    ("resource.upload", "Upload resources"),
    ("resource.approve", "Approve uploaded resources"),
    ("university.manage", "Manage universities and colleges"),
    ("user.manage", "Manage users and roles"),
]
ROLES = [
    ("student", "Default student role"),
    ("contributor", "Verified uploader"),
    ("moderator", "Reviews and approves resources"),
    ("admin", "Full platform access"),
]


async def upsert(collection, key: dict, model):
    doc = model.to_mongo()
    existing = await collection.find_one(key)
    if existing:
        await collection.update_one({"_id": existing["_id"]}, {"$set": doc})
        return str(existing["_id"])
    res = await collection.insert_one(doc)
    return str(res.inserted_id)


async def run():
    await ensure_indexes()

    for name, desc in PERMISSIONS:
        await upsert(db.permissions, {"name": name}, Permission(name=name, description=desc))
    for name, desc in ROLES:
        await upsert(db.roles, {"name": name}, Role(name=name, description=desc))

    state_id = await upsert(db.states, {"code": "CG"},
                            State(name="Chhattisgarh", code="CG", country_code="IN"))

    uni_id = await upsert(
        db.universities, {"slug": "hemchand-yadav-vishwavidyalaya"},
        University(
            state_id=state_id,
            name="Hemchand Yadav Vishwavidyalaya",
            short_name="Durg University",
            slug="hemchand-yadav-vishwavidyalaya",
            description="State university headquartered in Durg, Chhattisgarh, serving affiliated colleges across the Durg division.",
            official_website="https://durguniversity.ac.in",
            official_result_url="https://durguniversity.ac.in/results",
            official_notice_url="https://durguniversity.ac.in/notices",
            banner_url="https://images.pexels.com/photos/31656148/pexels-photo-31656148.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            is_demo=True,
        ),
    )

    college_id = await upsert(
        db.colleges, {"slug": "govt-vys-pg-autonomous-college-durg"},
        College(
            university_id=uni_id,
            name="Govt. V.Y.T. PG Autonomous College, Durg",
            slug="govt-vys-pg-autonomous-college-durg",
            city="Durg",
            address="Sector 6, Bhilai Road, Durg, Chhattisgarh",
            description="Demo college record for development.",
            is_demo=True,
        ),
    )

    courses = {}
    for name, short, slug, ctype, dur in [
        ("Bachelor of Computer Application", "BCA", "bca", "UG", "3 Years"),
        ("Bachelor of Commerce", "B.Com", "bcom", "UG", "3 Years"),
    ]:
        courses[short] = await upsert(
            db.courses, {"slug": slug},
            Course(university_id=uni_id, name=name, short_name=short, slug=slug,
                   course_type=ctype, duration=dur, is_demo=True),
        )

    subjects = {}
    subject_seed = [
        ("BCA", "Programming in C", "BCA-101", "Semester 1"),
        ("BCA", "Digital Electronics", "BCA-102", "Semester 1"),
        ("BCA", "Data Structures", "BCA-201", "Semester 2"),
        ("BCA", "Database Management Systems", "BCA-301", "Semester 3"),
        ("B.Com", "Financial Accounting", "BCOM-101", "Semester 1"),
        ("B.Com", "Business Economics", "BCOM-102", "Semester 1"),
        ("B.Com", "Corporate Law", "BCOM-202", "Semester 2"),
    ]
    for course_key, name, code, sem in subject_seed:
        subjects[code] = await upsert(
            db.subjects, {"course_id": courses[course_key], "code": code},
            Subject(course_id=courses[course_key], name=name, code=code,
                    semester_or_year=sem, is_demo=True),
        )

    categories = {}
    for name, slug, icon, desc in [
        ("Question Papers", "question-papers", "FileText", "Previous year university papers"),
        ("Notes", "notes", "NotebookPen", "Chapter-wise study notes"),
        ("Syllabus", "syllabus", "ListChecks", "Official course syllabus"),
        ("Books", "books", "BookOpen", "Reference books and e-books"),
        ("Practicals", "practicals", "FlaskConical", "Lab manuals and practical files"),
        ("Assignments", "assignments", "ClipboardList", "Assignment sets and solutions"),
    ]:
        categories[slug] = await upsert(
            db.categories, {"slug": slug},
            Category(name=name, slug=slug, icon=icon, description=desc),
        )

    resource_seed = [
        ("Programming in C - Previous Year Paper 2024", "programming-in-c-paper-2024",
         "question-papers", "BCA-101", "BCA", 2024, "pdf", True, False, 1840, 320),
        ("Data Structures Complete Notes", "data-structures-complete-notes",
         "notes", "BCA-201", "BCA", 2025, "pdf", True, False, 2960, 810),
        ("DBMS Unit 1-3 Handwritten Notes", "dbms-unit-1-3-handwritten-notes",
         "notes", "BCA-301", "BCA", 2025, "pdf", False, False, 1120, 240),
        ("BCA Syllabus 2025-26", "bca-syllabus-2025-26",
         "syllabus", "BCA-102", "BCA", 2025, "pdf", True, False, 640, 190),
        ("Financial Accounting Previous Year Paper 2023", "financial-accounting-paper-2023",
         "question-papers", "BCOM-101", "B.Com", 2023, "pdf", True, False, 1490, 410),
        ("Business Economics Chapter Notes", "business-economics-chapter-notes",
         "notes", "BCOM-102", "B.Com", 2024, "pdf", False, True, 880, 130),
    ]
    for (title, slug, cat, subj_code, course_key, year, ftype,
         verified, premium, views, downloads) in resource_seed:
        await upsert(
            db.resources, {"slug": slug},
            Resource(
                university_id=uni_id, college_id=college_id,
                course_id=courses[course_key], subject_id=subjects[subj_code],
                category_id=categories[cat], title=title, slug=slug,
                description="Demo resource record created for development. Real files arrive in Step 4.",
                file_type=ftype, file_size=1_240_000, year=year,
                is_verified=verified, is_premium=premium,
                views=views, downloads=downloads, is_demo=True,
            ),
        )

    print("Seed complete (demo data).")


if __name__ == "__main__":
    asyncio.run(run())
