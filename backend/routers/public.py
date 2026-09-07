"""Public (no-auth) endpoints for publicly downloadable content.

Approved PDFs and resources are accessible to anyone — no login required.
Downloads are counted for analytics.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response

from database import db
from storage import get_object

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])

APPROVED = "approved"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------- public PDF list
@router.get("/pdfs")
async def public_pdf_list(
    q: Optional[str] = None,
    subject: Optional[str] = None,
    semester: Optional[str] = None,
    college_code: Optional[int] = None,
    sort: str = Query("recent", pattern="^(recent|popular|downloads)$"),
    limit: int = Query(24, le=60),
    skip: int = 0,
):
    """List all approved PDFs — publicly accessible, no login required."""
    filters = {"status": APPROVED, "is_deleted": {"$ne": True}}
    if q:
        filters["$or"] = [
            {"title": {"$regex": q.strip()[:80], "$options": "i"}},
            {"subject": {"$regex": q.strip()[:80], "$options": "i"}},
        ]
    if subject:
        filters["subject"] = {"$regex": f"^{subject.strip()[:80]}", "$options": "i"}
    if semester:
        filters["semester"] = semester
    if college_code:
        filters["college_code"] = college_code

    sort_map = {
        "recent": ("approved_at", -1),
        "popular": ("downloads", -1),
        "downloads": ("downloads", -1),
    }
    sort_field, direction = sort_map.get(sort, ("approved_at", -1))

    cursor = db.pdf_documents.find(filters).sort(sort_field, direction).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.pdf_documents.count_documents(filters)

    items = []
    for doc in docs:
        items.append({
            "id": str(doc["_id"]),
            "title": doc.get("title"),
            "description": doc.get("description"),
            "file_name": doc.get("file_name"),
            "file_size": doc.get("file_size"),
            "mime_type": doc.get("mime_type"),
            "file_type": doc.get("file_type"),
            "subject": doc.get("subject"),
            "semester": doc.get("semester"),
            "session": doc.get("session"),
            "college_name": doc.get("college_name"),
            "college_code": doc.get("college_code"),
            "uploaded_by_name": doc.get("uploader_name"),
            "uploaded_at": doc.get("uploaded_at"),
            "approved_at": doc.get("approved_at"),
            "downloads": doc.get("downloads", 0),
            "pages": doc.get("pages"),
        })

    return {"items": items, "total": total}


# ---------------------------------------------------------------- public PDF detail
@router.get("/pdfs/{pdf_id}")
async def public_pdf_detail(pdf_id: str):
    """Get details of a single approved PDF — publicly accessible."""
    from routers.catalog import oid
    try:
        doc = await db.pdf_documents.find_one({
            "_id": oid(pdf_id),
            "status": APPROVED,
            "is_deleted": {"$ne": True},
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": str(doc["_id"]),
        "title": doc.get("title"),
        "description": doc.get("description"),
        "file_name": doc.get("file_name"),
        "file_size": doc.get("file_size"),
        "mime_type": doc.get("mime_type"),
        "file_type": doc.get("file_type"),
        "subject": doc.get("subject"),
        "semester": doc.get("semester"),
        "session": doc.get("session"),
        "college_name": doc.get("college_name"),
        "college_code": doc.get("college_code"),
        "uploaded_by_name": doc.get("uploader_name"),
        "uploaded_at": doc.get("uploaded_at"),
        "approved_at": doc.get("approved_at"),
        "downloads": doc.get("downloads", 0),
        "pages": doc.get("pages"),
    }


# ---------------------------------------------------------------- public PDF download
@router.get("/pdfs/{pdf_id}/download")
async def public_pdf_download(pdf_id: str, request: Request):
    """Download an approved PDF — no login required. Counts the download."""
    from routers.catalog import oid
    try:
        doc = await db.pdf_documents.find_one({
            "_id": oid(pdf_id),
            "status": APPROVED,
            "is_deleted": {"$ne": True},
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Increment download counter
    await db.pdf_documents.update_one(
        {"_id": doc["_id"]},
        {"$inc": {"downloads": 1}, "$set": {"updated_at": now_iso()}},
    )

    # Serve the file from storage
    try:
        data, content_type = get_object(doc["file_path"])
    except Exception:
        logger.exception("Public PDF fetch from storage failed")
        raise HTTPException(status_code=502, detail="Could not load this file right now")

    filename = doc.get("file_name", "document.pdf")
    return Response(
        content=data,
        media_type=content_type or "application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "public, max-age=3600",
        },
    )


# ---------------------------------------------------------------- public announcements
@router.get("/announcements")
async def public_announcements(limit: int = Query(10, le=50)):
    """List active public announcements — no login required."""
    filters = {
        "status": "active",
        "is_deleted": {"$ne": True},
        "publish_date": {"$lte": now_iso()},
    }
    cursor = db.announcements.find(filters).sort("publish_date", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return {
        "items": [
            {
                "id": str(d["_id"]),
                "title": d.get("title"),
                "message": d.get("message"),
                "type": d.get("type", "info"),
                "publish_date": d.get("publish_date"),
                "expires_at": d.get("expires_at"),
                "priority": d.get("priority", "normal"),
            }
            for d in docs
        ]
    }


# ---------------------------------------------------------------- public stats
@router.get("/stats")
async def public_stats():
    """Public platform statistics for the homepage/widgets."""
    return {
        "total_approved_pdfs": await db.pdf_documents.count_documents(
            {"status": APPROVED, "is_deleted": {"$ne": True}}
        ),
        "total_downloads": (
            await db.pdf_documents.aggregate([
                {"$match": {"status": APPROVED, "is_deleted": {"$ne": True}}},
                {"$group": {"_id": None, "total": {"$sum": "$downloads"}}},
            ]).to_list(1)
        )[0]["total"] if await db.pdf_documents.count_documents({"status": APPROVED}) > 0 else 0,
        "total_colleges": await db.colleges.count_documents(
            {"is_active": True, "is_deleted": {"$ne": True}}
        ),
        "total_courses": await db.courses.count_documents(
            {"status": "active", "is_deleted": {"$ne": True}}
        ),
        "total_resources": await db.resources.count_documents(
            {"status": "active", "is_deleted": {"$ne": True}}
        ),
    }
