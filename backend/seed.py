"""Development-only seed data. All records are flagged is_demo=True."""
import asyncio

from database import db, ensure_indexes
from models import (Category, College, Course, Permission, Resource, Role,
                    State, Subject, University, Teacher, TeacherContent)

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

    # Additional universities seeded following the same pattern as Durg
    prsu_id = await upsert(
        db.universities, {"slug": "pt-ravishankar-shukla-university"},
        University(
            state_id=state_id,
            name="Pt. Ravishankar Shukla University",
            short_name="Raipur University",
            slug="pt-ravishankar-shukla-university",
            description="State university headquartered in Raipur (PRSU), offering undergraduate and postgraduate programs across multiple disciplines.",
            official_website="https://prsu.ac.in",
            official_result_url="https://prsu.ac.in/results",
            official_notice_url="https://prsu.ac.in/notices",
            banner_url="https://images.pexels.com/photos/356043/pexels-photo-356043.jpeg",
            is_demo=True,
        ),
    )

    snpv_id = await upsert(
        db.universities, {"slug": "shaheed-nandkumar-patel-vishwavidyalaya"},
        University(
            state_id=state_id,
            name="Shaheed Nandkumar Patel Vishwavidyalaya",
            short_name="Raigarh University",
            slug="shaheed-nandkumar-patel-vishwavidyalaya",
            description="Regional university serving the Raigarh area (SNPV), with a focus on science and technology courses.",
            official_website="https://snpv.ac.in",
            official_result_url="https://snpv.ac.in/results",
            official_notice_url="https://snpv.ac.in/notices",
            banner_url="https://images.pexels.com/photos/4145159/pexels-photo-4145159.jpeg",
            is_demo=True,
        ),
    )

    bastar_id = await upsert(
        db.universities, {"slug": "bastar-university-shaheed-mahendra-karma"},
        University(
            state_id=state_id,
            name="Bastar University / Shaheed Mahendra Karma Vishwavidyalaya",
            short_name="Bastar University",
            slug="bastar-university-shaheed-mahendra-karma",
            description="Bastar region university (SMKV) providing regional higher-education access and affiliated colleges support.",
            official_website="https://bastaruniversity.ac.in",
            official_result_url="https://bastaruniversity.ac.in/results",
            official_notice_url="https://bastaruniversity.ac.in/notices",
            banner_url="https://images.pexels.com/photos/356043/pexels-photo-356043.jpeg",
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

    # Seed small sample courses, subjects and a demo resource for PRSU
    prsu_courses = {}
    for name, short, slug in [
        ("Bachelor of Science", "BSc", "prsu-bsc"),
        ("Master of Science", "MSc", "prsu-msc"),
    ]:
        prsu_courses[short] = await upsert(
            db.courses, {"slug": slug},
            Course(university_id=prsu_id, name=name, short_name=short, slug=slug,
                   course_type="UG/PG", duration="2-3 Years", is_demo=True),
        )

    prsu_subjects = {}
    for course_key, name, code, sem in [
        ("BSc", "Physics", "PRSU-PHY-101", "Semester 1"),
        ("BSc", "Chemistry", "PRSU-CHE-101", "Semester 1"),
    ]:
        prsu_subjects[code] = await upsert(
            db.subjects, {"course_id": prsu_courses[course_key], "code": code},
            Subject(course_id=prsu_courses[course_key], name=name, code=code,
                    semester_or_year=sem, is_demo=True),
        )

    await upsert(
        db.resources, {"slug": "prsu-sample-syllabus-2025"},
        Resource(
            university_id=prsu_id, college_id=None,
            course_id=prsu_courses.get("BSc"), subject_id=prsu_subjects.get("PRSU-PHY-101"),
            category_id=categories.get("syllabus"), title="PRSU BSc Physics Syllabus 2025",
            slug="prsu-sample-syllabus-2025",
            description="Sample syllabus for PRSU seeded for demo.", file_type="pdf",
            file_size=512_000, year=2025, is_verified=True, is_demo=True,
        ),
    )

    # Seed small sample courses, subjects and a demo resource for SNPV
    snpv_courses = {}
    for name, short, slug in [
        ("Bachelor of Science", "BSc", "snpv-bsc"),
        ("Diploma in Engineering", "DE", "snpv-de"),
    ]:
        snpv_courses[short] = await upsert(
            db.courses, {"slug": slug},
            Course(university_id=snpv_id, name=name, short_name=short, slug=slug,
                   course_type="UG/PG", duration="2-4 Years", is_demo=True),
        )

    snpv_subjects = {}
    for course_key, name, code, sem in [
        ("BSc", "Mathematics", "SNPV-MAT-101", "Semester 1"),
        ("DE", "Engineering Basics", "SNPV-DE-101", "Year 1"),
    ]:
        snpv_subjects[code] = await upsert(
            db.subjects, {"course_id": snpv_courses[course_key], "code": code},
            Subject(course_id=snpv_courses[course_key], name=name, code=code,
                    semester_or_year=sem, is_demo=True),
        )

    await upsert(
        db.resources, {"slug": "snpv-sample-syllabus-2025"},
        Resource(
            university_id=snpv_id, college_id=None,
            course_id=snpv_courses.get("BSc"), subject_id=snpv_subjects.get("SNPV-MAT-101"),
            category_id=categories.get("syllabus"), title="SNPV BSc Mathematics Syllabus 2025",
            slug="snpv-sample-syllabus-2025",
            description="Sample syllabus for SNPV seeded for demo.", file_type="pdf",
            file_size=420_000, year=2025, is_verified=True, is_demo=True,
        ),
    )

    # Seed small sample courses, subjects and a demo resource for Bastar University
    bastar_courses = {}
    for name, short, slug in [
        ("Bachelor of Arts", "BA", "bastar-ba"),
        ("Master of Arts", "MA", "bastar-ma"),
    ]:
        bastar_courses[short] = await upsert(
            db.courses, {"slug": slug},
            Course(university_id=bastar_id, name=name, short_name=short, slug=slug,
                   course_type="UG/PG", duration="2-3 Years", is_demo=True),
        )

    bastar_subjects = {}
    for course_key, name, code, sem in [
        ("BA", "History", "BA-HIS-101", "Semester 1"),
        ("MA", "Political Science", "MA-PS-501", "Semester 1"),
    ]:
        bastar_subjects[code] = await upsert(
            db.subjects, {"course_id": bastar_courses[course_key], "code": code},
            Subject(course_id=bastar_courses[course_key], name=name, code=code,
                    semester_or_year=sem, is_demo=True),
        )

    await upsert(
        db.resources, {"slug": "bastar-sample-syllabus-2025"},
        Resource(
            university_id=bastar_id, college_id=None,
            course_id=bastar_courses.get("BA"), subject_id=bastar_subjects.get("BA-HIS-101"),
            category_id=categories.get("syllabus"), title="Bastar BA History Syllabus 2025",
            slug="bastar-sample-syllabus-2025",
            description="Sample syllabus for Bastar University seeded for demo.", file_type="pdf",
            file_size=380_000, year=2025, is_verified=True, is_demo=True,
        ),
    )

    # Seed demo teachers and contents for the new universities
    # PRSU teacher
    prsu_teacher_id = await upsert(
        db.teachers, {"name": "Dr. A. K. Sharma", "institution": "PRSU Science College"},
        Teacher(name="Dr. A. K. Sharma", designation="Professor", institution="PRSU Science College", university_id=prsu_id, bio="Physics faculty with research interests in condensed matter.", is_demo=True),
    )
    # SNPV teacher
    snpv_teacher_id = await upsert(
        db.teachers, {"name": "Dr. S. Verma", "institution": "SNPV Institute"},
        Teacher(name="Dr. S. Verma", designation="Associate Professor", institution="SNPV Institute", university_id=snpv_id, bio="Mathematics faculty focusing on algebra and topology.", is_demo=True),
    )
    # Bastar teacher
    bastar_teacher_id = await upsert(
        db.teachers, {"name": "Ms. L. K. Patel", "institution": "Bastar Arts College"},
        Teacher(name="Ms. L. K. Patel", designation="Lecturer", institution="Bastar Arts College", university_id=bastar_id, bio="History lecturer and regional studies author.", is_demo=True),
    )

    # Seed a sample content item for each teacher
    await upsert(
        db.teacher_content, {"title": "Introduction to Quantum Mechanics - PRSU"},
        TeacherContent(teacher_id=prsu_teacher_id, content_type="article", title="Introduction to Quantum Mechanics - PRSU", excerpt="A gentle introduction to quantum concepts.", content_html="<p>This is a demo article.</p>", tags=["physics","quantum"], featured=True, status="published", published_at=2025, is_demo=True),
    )
    await upsert(
        db.teacher_content, {"title": "Mathematics: Number Theory Basics - SNPV"},
        TeacherContent(teacher_id=snpv_teacher_id, content_type="educational", title="Mathematics: Number Theory Basics - SNPV", excerpt="Basic number theory for undergraduates.", content_html="<p>Demo notes.</p>", tags=["math","number-theory"], featured=False, status="published", published_at=2025, is_demo=True),
    )
    await upsert(
        db.teacher_content, {"title": "History of Bastar Region - Bastar"},
        TeacherContent(teacher_id=bastar_teacher_id, content_type="story", title="History of Bastar Region - Bastar", excerpt="An overview of Bastar's cultural history.", content_html="<p>Demo story.</p>", tags=["history"], featured=False, status="published", published_at=2025, is_demo=True),
    )

    print("Seed complete (demo data).")


if __name__ == "__main__":
    asyncio.run(run())
