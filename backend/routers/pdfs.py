"""Student PDF uploads with a strict admin approval workflow.

Files live in private object storage. Nothing is publicly readable: every byte is
served by this router after an authorization check, and a student can never
approve or publish their own document.
"""
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import (APIRouter, Depends, File, Form, HTTPException, Query,
                     Request, Response, UploadFile)
from pydantic import BaseModel, Field

from auth import (ROLE_PERMISSIONS, get_current_user, require_permission,
                  require_staff)
from database import db
from routers.catalog import oid
from security import rate_limit, record_event
from storage import build_path, get_object, put_object

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdfs", tags=["pdfs"])
admin_router = APIRouter(prefix="/admin/pdfs", tags=["pdfs-admin"],
                         dependencies=[Depends(require_staff)])

MAX_BYTES = 25 * 1024 * 1024
PENDING, APPROVED, REJECTED = "pending", "approved", "rejected"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_doc(doc: dict, include_reviewer: bool = False) -> dict:
    item = {
        "id": str(doc["_id"]),
        "title": doc.get("title"),
        "description": doc.get("description"),
        "file_name": doc.get("file_name"),
        "file_size": doc.get("file_size"),
        "mime_type": doc.get("mime_type"),
        "uploaded_by": doc.get("uploaded_by"),
        "uploaded_at": doc.get("uploaded_at"),
        "status": doc.get("status"),
        "approved_at": doc.get("approved_at"),
        "rejection_reason": doc.get("rejection_reason"),
        "college_code": doc.get("college_code"),
        "college_name": doc.get("college_name"),
        "subject": doc.get("subject"),
        "semester": doc.get("semester"),
        "session": doc.get("session"),
        "pages": doc.get("pages"),
    }
    if include_reviewer:
        item.update({
            "approved_by": doc.get("approved_by"),
            "uploader_name": doc.get("uploader_name"),
            "uploader_email": doc.get("uploader_email"),
        })
    return item


async def load_doc(pdf_id: str) -> dict:
    doc = await db.pdf_documents.find_one({"_id": oid(pdf_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def readable_doc(pdf_id: str, user: dict) -> dict:
    """Owner and staff can always read; everyone else only once approved."""
    doc = await load_doc(pdf_id)
    is_owner = doc.get("uploaded_by") == str(user["_id"])
    is_staff = "resource:approve" in ROLE_PERMISSIONS.get(user.get("role", "student"), set())
    if is_owner or is_staff or doc.get("status") == APPROVED:
        return doc
    raise HTTPException(status_code=404, detail="Document not found")


# ---------------------------------------------------------------- student upload
@router.post("", status_code=201)
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    semester: str = Form(...),
    session: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    user_id = str(user["_id"])
    await rate_limit(f"pdf-upload:{user_id}", limit=20, window_seconds=3600,
                     message="Upload limit reached for now. Please try again later.")

    title = (title or "").strip()
    if len(title) < 3:
        raise HTTPException(status_code=400, detail="Give your document a clear title")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    if (file.content_type or "").lower() not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="That file is empty")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="PDF must be 25 MB or smaller")
    if not data[:5].startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="This file is not a valid PDF")

    checksum = hashlib.sha256(data).hexdigest()
    duplicate = await db.pdf_documents.find_one({
        "uploaded_by": user_id, "checksum": checksum, "is_deleted": {"$ne": True},
    })
    if duplicate:
        raise HTTPException(status_code=409,
                            detail="You have already uploaded this exact file")

    file_id = uuid.uuid4().hex
    path = build_path(user_id, file_id)
    try:
        result = put_object(path, data, "application/pdf")
    except Exception:
        logger.exception("PDF upload to object storage failed")
        raise HTTPException(status_code=502,
                            detail="Upload failed on the server. Please try again.")

    doc = {
        "title": title,
        "description": (description or "").strip() or None,
        "file_name": file.filename,
        "file_path": result.get("path", path),
        "file_size": len(data),
        "mime_type": "application/pdf",
        "checksum": checksum,
        "uploaded_by": user_id,
        "uploader_name": user.get("name"),
        "uploader_email": user.get("email"),
        "uploaded_at": now_iso(),
        # Status is server-assigned. A student can never publish their own upload.
        "status": PENDING,
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": None,
        "college_code": user.get("college_code"),
        "college_name": user.get("college_name"),
        "district": user.get("district"),
        "course_id": user.get("course_id"),
        "subject": subject.strip(),
        "semester": semester.strip(),
        "session": (session or "").strip() or None,
        "is_deleted": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    inserted = await db.pdf_documents.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    await record_event("pdf_uploaded", request, user_id, user.get("email"),
                       {"pdf_id": str(inserted.inserted_id)})
    return public_doc(doc)


@router.get("/mine")
async def my_uploads(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected)$"),
    user: dict = Depends(get_current_user),
):
    filters = {"uploaded_by": str(user["_id"]), "is_deleted": {"$ne": True}}
    if status:
        filters["status"] = status
    cursor = db.pdf_documents.find(filters).sort("uploaded_at", -1).limit(100)
    return {"items": [public_doc(d) for d in await cursor.to_list(100)]}


@router.get("/approved")
async def approved_pdfs(
    q: Optional[str] = None,
    subject: Optional[str] = None,
    semester: Optional[str] = None,
    limit: int = Query(24, le=60),
    skip: int = 0,
):
    filters = {"status": APPROVED, "is_deleted": {"$ne": True}}
    if q:
        filters["title"] = {"$regex": q.strip()[:80], "$options": "i"}
    if subject:
        filters["subject"] = subject
    if semester:
        filters["semester"] = semester
    cursor = db.pdf_documents.find(filters).sort("approved_at", -1).skip(skip).limit(limit)
    return {
        "items": [public_doc(d) for d in await cursor.to_list(limit)],
        "total": await db.pdf_documents.count_documents(filters),
    }


@router.get("/{pdf_id}")
async def pdf_detail(pdf_id: str, user: dict = Depends(get_current_user)):
    return public_doc(await readable_doc(pdf_id, user))


@router.get("/{pdf_id}/file")
async def pdf_file(pdf_id: str, user: dict = Depends(get_current_user)):
    doc = await readable_doc(pdf_id, user)
    try:
        data, content_type = get_object(doc["file_path"])
    except Exception:
        logger.exception("PDF fetch from object storage failed")
        raise HTTPException(status_code=502, detail="Could not load this file right now")
    return Response(
        content=data,
        media_type=content_type or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{doc.get("file_name", "document.pdf")}"'},
    )


@router.delete("/{pdf_id}")
async def delete_own_pdf(pdf_id: str, user: dict = Depends(get_current_user)):
    doc = await load_doc(pdf_id)
    if doc.get("uploaded_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="You can only remove your own uploads")
    if doc.get("status") == APPROVED:
        raise HTTPException(status_code=400,
                            detail="Approved documents can only be removed by an admin")
    await db.pdf_documents.update_one(
        {"_id": doc["_id"]}, {"$set": {"is_deleted": True, "updated_at": now_iso()}}
    )
    return {"message": "Upload removed"}


# ------------------------------------------------------------------ admin review
class RejectPayload(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@admin_router.get("")
async def admin_list(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected)$"),
    q: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    user: dict = Depends(require_permission("resource:read")),
):
    filters = {"is_deleted": {"$ne": True}}
    if status:
        filters["status"] = status
    if q:
        filters["title"] = {"$regex": q.strip()[:80], "$options": "i"}
    cursor = db.pdf_documents.find(filters).sort("uploaded_at", -1).skip(skip).limit(limit)
    counts = {
        s: await db.pdf_documents.count_documents({"status": s, "is_deleted": {"$ne": True}})
        for s in (PENDING, APPROVED, REJECTED)
    }
    return {
        "items": [public_doc(d, include_reviewer=True) for d in await cursor.to_list(limit)],
        "total": await db.pdf_documents.count_documents(filters),
        "counts": counts,
    }


async def _review(pdf_id: str, actor: dict, updates: dict, event: str, request: Request):
    doc = await load_doc(pdf_id)
    if doc.get("uploaded_by") == str(actor["_id"]):
        raise HTTPException(status_code=403, detail="You cannot review your own upload")
    updates["updated_at"] = now_iso()
    await db.pdf_documents.update_one({"_id": doc["_id"]}, {"$set": updates})
    await record_event(event, request, str(actor["_id"]), actor.get("email"),
                       {"pdf_id": pdf_id})
    return public_doc(await db.pdf_documents.find_one({"_id": doc["_id"]}),
                      include_reviewer=True)


@admin_router.post("/{pdf_id}/approve")
async def approve_pdf(pdf_id: str, request: Request,
                      actor: dict = Depends(require_permission("resource:approve"))):
    return await _review(pdf_id, actor, {
        "status": APPROVED,
        "approved_by": str(actor["_id"]),
        "approved_at": now_iso(),
        "rejection_reason": None,
    }, "pdf_approved", request)


@admin_router.post("/{pdf_id}/reject")
async def reject_pdf(pdf_id: str, payload: RejectPayload, request: Request,
                     actor: dict = Depends(require_permission("resource:approve"))):
    return await _review(pdf_id, actor, {
        "status": REJECTED,
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": payload.reason.strip(),
    }, "pdf_rejected", request)


@admin_router.delete("/{pdf_id}")
async def admin_delete_pdf(pdf_id: str, request: Request,
                           actor: dict = Depends(require_permission("resource:delete"))):
    doc = await load_doc(pdf_id)
    await db.pdf_documents.update_one(
        {"_id": doc["_id"]},
        {"$set": {"is_deleted": True, "status": REJECTED, "updated_at": now_iso()}},
    )
    await db.bookmarks.delete_many({"resource_id": str(doc["_id"]), "kind": "pdf"})
    await record_event("pdf_deleted", request, str(actor["_id"]), actor.get("email"),
                       {"pdf_id": pdf_id})
    return {"message": "Document deleted"}


# Used by the AI router to load bytes for text extraction.
async def pdf_bytes_for(pdf_id: str, user: dict) -> tuple[dict, bytes]:
    doc = await readable_doc(pdf_id, user)
    try:
        data, _ = get_object(doc["file_path"])
    except Exception:
        logger.exception("PDF fetch for AI failed")
        raise HTTPException(status_code=502, detail="Could not load this file right now")
    return doc, data
