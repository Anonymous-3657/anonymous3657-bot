"""Admin syllabus management with secure storage-backed PDF delivery."""
import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile

from auth import ROLE_PERMISSIONS, get_current_user, require_permission, require_staff
from database import db
from routers.catalog import oid
from security import record_event
from storage import build_path, get_object, put_object

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/syllabus", tags=["syllabus"])
admin_router = APIRouter(prefix="/admin/syllabus", tags=["syllabus-admin"], dependencies=[Depends(require_staff)])

MAX_BYTES = 25 * 1024 * 1024
PUBLISHED = "published"
UNPUBLISHED = "unpublished"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_segment(value: str, fallback: str = "item") -> str:
    text = re.sub(r"[^a-zA-Z0-9._-]+", "-", (value or "").strip())
    text = text.strip(".-")
    return text[:80] or fallback


def sanitize_path(category: str, course: str, year: str, semester: str, subject: str, session: str) -> str:
    category_part = safe_segment(category, "category")
    course_part = safe_segment(course, "course")
    year_part = safe_segment(year, "year")
    semester_part = safe_segment(semester, "semester")
    subject_part = safe_segment(subject, "subject")
    session_part = safe_segment(session, "session")
    return f"syllabus/{category_part}/{course_part}/{year_part}/{semester_part}/{subject_part}/{session_part}"


def public_item(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "category": doc.get("category"),
        "course": doc.get("course"),
        "year": doc.get("year"),
        "semester": doc.get("semester"),
        "subject_name": doc.get("subject_name"),
        "subject_code": doc.get("subject_code"),
        "syllabus_title": doc.get("syllabus_title"),
        "academic_session": doc.get("academic_session"),
        "pdf_file_url": doc.get("pdf_file_url"),
        "storage_path": doc.get("storage_path"),
        "file_name": doc.get("file_name"),
        "file_size": doc.get("file_size"),
        "uploaded_by": doc.get("uploaded_by"),
        "uploaded_by_name": doc.get("uploaded_by_name"),
        "uploaded_at": doc.get("uploaded_at"),
        "updated_at": doc.get("updated_at"),
        "status": doc.get("status"),
        "description": doc.get("description"),
        "is_deleted": bool(doc.get("is_deleted", False)),
    }


async def get_syllabus_or_404(syllabus_id: str) -> dict:
    doc = await db.syllabus.find_one({"_id": oid(syllabus_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return doc


async def _duplicate_exists(category: str, course: str, year: str, semester: str,
                           subject_name: str, academic_session: str) -> dict | None:
    return await db.syllabus.find_one({
        "category": category,
        "course": course,
        "year": year,
        "semester": semester,
        "subject_name": subject_name,
        "academic_session": academic_session,
        "is_deleted": {"$ne": True},
    })


@admin_router.get("", response_model=None)
async def admin_list_syllabus(
    category: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    subject_name: Optional[str] = Query(None),
    academic_session: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(published|unpublished)$"),
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    actor: dict = Depends(require_permission("syllabus:read")),
):
    filters = {"is_deleted": {"$ne": True}}
    if category:
        filters["category"] = category
    if course:
        filters["course"] = course
    if semester:
        filters["semester"] = semester
    if subject_name:
        filters["subject_name"] = {"$regex": subject_name.strip()[:80], "$options": "i"}
    if academic_session:
        filters["academic_session"] = academic_session
    if status:
        filters["status"] = status
    if q:
        qterm = q.strip()[:80]
        filters["$or"] = [
            {"syllabus_title": {"$regex": qterm, "$options": "i"}},
            {"subject_name": {"$regex": qterm, "$options": "i"}},
            {"subject_code": {"$regex": qterm, "$options": "i"}},
        ]
    cursor = db.syllabus.find(filters).sort("uploaded_at", -1).skip(skip).limit(limit)
    items = [public_item(d) for d in await cursor.to_list(limit)]
    return {"items": items, "total": await db.syllabus.count_documents(filters), "skip": skip, "limit": limit}


@admin_router.get("/stats")
async def syllabus_stats(actor: dict = Depends(require_permission("syllabus:read"))):
    filters = {"is_deleted": {"$ne": True}}
    published_count = await db.syllabus.count_documents({**filters, "status": PUBLISHED})
    unpublished_count = await db.syllabus.count_documents({**filters, "status": UNPUBLISHED})
    total = await db.syllabus.count_documents(filters)
    total_categories = await db.syllabus.distinct("category", filters)
    total_courses = await db.syllabus.distinct("course", filters)
    total_subjects = await db.syllabus.distinct("subject_name", filters)
    recent_uploaded = [public_item(d) async for d in db.syllabus.find(filters).sort("uploaded_at", -1).limit(5)]
    recent_updated = [public_item(d) async for d in db.syllabus.find(filters).sort("updated_at", -1).limit(5)]
    return {
        "total": total,
        "published": published_count,
        "unpublished": unpublished_count,
        "categories": len(total_categories),
        "courses": len(total_courses),
        "subjects": len(total_subjects),
        "recent_uploaded": recent_uploaded,
        "recent_updated": recent_updated,
    }


@admin_router.post("", status_code=201)
async def upload_syllabus(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(...),
    course: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject_name: str = Form(...),
    subject_code: Optional[str] = Form(None),
    syllabus_title: str = Form(...),
    academic_session: str = Form(...),
    description: Optional[str] = Form(None),
    status: str = Form(PUBLISHED),
    actor: dict = Depends(require_permission("syllabus:write")),
):
    category = (category or "").strip()
    course = (course or "").strip()
    year = (year or "").strip()
    semester = (semester or "").strip()
    subject_name = (subject_name or "").strip()
    syllabus_title = (syllabus_title or "").strip()
    if not category or not course or not year or not semester or not subject_name or not syllabus_title:
        raise HTTPException(status_code=400, detail="All syllabus fields are required")

    if status not in {PUBLISHED, UNPUBLISHED}:
        raise HTTPException(status_code=400, detail="Status must be published or unpublished")

    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    content_type = (file.content_type or "").lower()
    if content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="That file is empty")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File must be 25 MB or smaller")
    if not data[:5].startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="This file is not a valid PDF")

    duplicate = await _duplicate_exists(category, course, year, semester, subject_name, academic_session)
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A syllabus already exists for this subject and academic session. Replace the existing file instead.",
        )

    file_id = uuid.uuid4().hex
    path = sanitize_path(category, course, year, semester, subject_name, academic_session)
    storage_path = f"{path}/{file_id}.pdf"
    try:
        result = put_object(storage_path, data, "application/pdf")
    except Exception:
        logger.exception("Syllabus upload failed")
        raise HTTPException(status_code=502, detail="Storage unavailable while uploading the syllabus PDF")

    doc = {
        "category": category,
        "course": course,
        "year": year,
        "semester": semester,
        "subject_name": subject_name,
        "subject_code": (subject_code or "").strip() or None,
        "syllabus_title": syllabus_title,
        "academic_session": (academic_session or "").strip() or None,
        "description": (description or "").strip() or None,
        "file_name": filename,
        "storage_path": storage_path,
        "pdf_file_url": f"/api/syllabus/{file_id}/file",
        "file_size": len(data),
        "uploaded_by": str(actor["_id"]),
        "uploaded_by_name": actor.get("name"),
        "uploaded_at": now_iso(),
        "updated_at": now_iso(),
        "status": status,
        "is_deleted": False,
        "checksum": hashlib.sha256(data).hexdigest(),
    }
    inserted = await db.syllabus.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    await record_event("syllabus_uploaded", request, str(actor["_id"]), actor.get("email"), {"syllabus_id": str(inserted.inserted_id)})
    return public_item(doc)


@router.get("")
async def public_syllabus_list(
    category: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[str] = None,
    semester: Optional[str] = None,
    subject_name: Optional[str] = None,
    academic_session: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
):
    filters = {"status": PUBLISHED, "is_deleted": {"$ne": True}}
    if category:
        filters["category"] = category
    if course:
        filters["course"] = course
    if year:
        filters["year"] = year
    if semester:
        filters["semester"] = semester
    if subject_name:
        filters["subject_name"] = {"$regex": subject_name.strip()[:80], "$options": "i"}
    if academic_session:
        filters["academic_session"] = academic_session
    cursor = db.syllabus.find(filters).sort("uploaded_at", -1).skip(skip).limit(limit)
    return {"items": [public_item(d) for d in await cursor.to_list(limit)], "total": await db.syllabus.count_documents(filters), "skip": skip, "limit": limit}


@router.get("/{syllabus_id}")
async def get_public_syllabus(syllabus_id: str):
    doc = await db.syllabus.find_one({"_id": oid(syllabus_id), "status": PUBLISHED, "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return public_item(doc)


@router.get("/{syllabus_id}/file")
async def get_syllabus_file(syllabus_id: str, download: bool = False):
    doc = await db.syllabus.find_one({"_id": oid(syllabus_id), "is_deleted": {"$ne": True}})
    if not doc or doc.get("status") != PUBLISHED:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception:
        logger.exception("Could not read syllabus file from storage")
        raise HTTPException(status_code=502, detail="This syllabus file could not be loaded right now")
    disposition = "attachment" if download else "inline"
    return Response(
        content=data,
        media_type=content_type or "application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{doc.get("file_name", "syllabus.pdf")}"'},
    )


@admin_router.put("/{syllabus_id}")
async def update_syllabus(
    request: Request,
    syllabus_id: str,
    category: Optional[str] = Form(None),
    course: Optional[str] = Form(None),
    year: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    subject_name: Optional[str] = Form(None),
    subject_code: Optional[str] = Form(None),
    syllabus_title: Optional[str] = Form(None),
    academic_session: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    file: UploadFile | None = File(default=None),
    actor: dict = Depends(require_permission("syllabus:write")),
):
    doc = await get_syllabus_or_404(syllabus_id)
    payload = {"updated_at": now_iso()}

    if category is not None:
        payload["category"] = category.strip() or doc.get("category")
    if course is not None:
        payload["course"] = course.strip() or doc.get("course")
    if year is not None:
        payload["year"] = year.strip() or doc.get("year")
    if semester is not None:
        payload["semester"] = semester.strip() or doc.get("semester")
    if subject_name is not None:
        payload["subject_name"] = subject_name.strip() or doc.get("subject_name")
    if subject_code is not None:
        payload["subject_code"] = subject_code.strip() or None
    if syllabus_title is not None:
        payload["syllabus_title"] = syllabus_title.strip() or doc.get("syllabus_title")
    if academic_session is not None:
        payload["academic_session"] = academic_session.strip() or doc.get("academic_session")
    if description is not None:
        payload["description"] = description.strip() or None
    if status is not None:
        payload["status"] = status

    if file is not None:
        filename = (file.filename or "").strip()
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        if (file.content_type or "").lower() not in {"application/pdf", "application/x-pdf"}:
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="That file is empty")
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="File must be 25 MB or smaller")
        if not data[:5].startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="This file is not a valid PDF")
        new_path = sanitize_path(
            payload.get("category", doc.get("category")),
            payload.get("course", doc.get("course")),
            payload.get("year", doc.get("year")),
            payload.get("semester", doc.get("semester")),
            payload.get("subject_name", doc.get("subject_name")),
            payload.get("academic_session", doc.get("academic_session")),
        )
        storage_path = f"{new_path}/{uuid.uuid4().hex}.pdf"
        try:
            result = put_object(storage_path, data, "application/pdf")
        except Exception:
            logger.exception("Replacing syllabus file failed")
            raise HTTPException(status_code=502, detail="Storage unavailable while replacing the syllabus PDF")
        payload["storage_path"] = storage_path
        payload["file_name"] = filename
        payload["pdf_file_url"] = f"/api/syllabus/{syllabus_id}/file"
        payload["file_size"] = len(data)
        payload["checksum"] = hashlib.sha256(data).hexdigest()

    await db.syllabus.update_one({"_id": doc["_id"]}, {"$set": payload})
    await record_event("syllabus_updated", request, str(actor["_id"]), actor.get("email"), {"syllabus_id": syllabus_id})
    return public_item(await db.syllabus.find_one({"_id": doc["_id"]}))


@admin_router.post("/{syllabus_id}/publish")
async def publish_syllabus(syllabus_id: str, request: Request, actor: dict = Depends(require_permission("syllabus:publish"))):
    doc = await get_syllabus_or_404(syllabus_id)
    await db.syllabus.update_one({"_id": doc["_id"]}, {"$set": {"status": PUBLISHED, "updated_at": now_iso()}})
    await record_event("syllabus_published", request, str(actor["_id"]), actor.get("email"), {"syllabus_id": syllabus_id})
    return {"message": "Syllabus published"}


@admin_router.post("/{syllabus_id}/unpublish")
async def unpublish_syllabus(syllabus_id: str, request: Request, actor: dict = Depends(require_permission("syllabus:publish"))):
    doc = await get_syllabus_or_404(syllabus_id)
    await db.syllabus.update_one({"_id": doc["_id"]}, {"$set": {"status": UNPUBLISHED, "updated_at": now_iso()}})
    await record_event("syllabus_unpublished", request, str(actor["_id"]), actor.get("email"), {"syllabus_id": syllabus_id})
    return {"message": "Syllabus unpublished"}


@admin_router.delete("/{syllabus_id}")
async def delete_syllabus(syllabus_id: str, request: Request, actor: dict = Depends(require_permission("syllabus:delete"))):
    doc = await get_syllabus_or_404(syllabus_id)
    await db.syllabus.update_one({"_id": doc["_id"]}, {"$set": {"is_deleted": True, "status": UNPUBLISHED, "updated_at": now_iso()}})
    await record_event("syllabus_deleted", request, str(actor["_id"]), actor.get("email"), {"syllabus_id": syllabus_id, "storage_path": doc.get("storage_path")})
    return {"message": "Syllabus deleted"}
