"""Admin analytics, announcements, export, and bulk actions."""
import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth import require_permission, require_staff
from database import db
from routers.catalog import oid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin-advanced"],
                   dependencies=[Depends(require_staff)])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================  ANALYTICS DASHBOARD
@router.get("/analytics")
async def analytics_dashboard(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(require_staff),
):
    """Rich analytics for the admin dashboard overview."""
    now = datetime.now(timezone.utc)
    since = (now - __import__("datetime").timedelta(days=days)).isoformat()

    # PDF stats
    pdf_total = await db.pdf_documents.count_documents({"is_deleted": {"$ne": True}})
    pdf_approved = await db.pdf_documents.count_documents(
        {"status": "approved", "is_deleted": {"$ne": True}})
    pdf_pending = await db.pdf_documents.count_documents(
        {"status": "pending", "is_deleted": {"$ne": True}})
    pdf_rejected = await db.pdf_documents.count_documents(
        {"status": "rejected", "is_deleted": {"$ne": True}})

    # Download totals
    download_agg = await db.pdf_documents.aggregate([
        {"$match": {"status": "approved", "is_deleted": {"$ne": True}}},
        {"$group": {"_id": None, "total_downloads": {"$sum": "$downloads"}}},
    ]).to_list(1)
    total_downloads = download_agg[0]["total_downloads"] if download_agg else 0

    # User stats
    user_total = await db.users.count_documents({"is_deleted": {"$ne": True}})
    user_active = await db.users.count_documents(
        {"status": "active", "is_deleted": {"$ne": True}})

    # Recent uploads (last N days)
    recent_uploads = await db.pdf_documents.count_documents({
        "is_deleted": {"$ne": True},
        "created_at": {"$gte": since},
    })

    # Recent approvals
    recent_approvals = await db.pdf_documents.count_documents({
        "status": "approved",
        "approved_at": {"$gte": since},
    })

    # Top subjects (by approved PDFs)
    top_subjects = await db.pdf_documents.aggregate([
        {"$match": {"status": "approved", "is_deleted": {"$ne": True}, "subject": {"$ne": None}}},
        {"$group": {"_id": "$subject", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)

    # Top colleges (by approved PDFs)
    top_colleges = await db.pdf_documents.aggregate([
        {"$match": {
            "status": "approved", "is_deleted": {"$ne": True},
            "college_name": {"$ne": None},
        }},
        {"$group": {"_id": "$college_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)

    # Most downloaded PDFs
    top_downloaded = await db.pdf_documents.aggregate([
        {"$match": {"status": "approved", "is_deleted": {"$ne": True}}},
        {"$sort": {"downloads": -1}},
        {"$limit": 10},
        {"$project": {
            "title": 1, "downloads": 1, "subject": 1, "college_name": 1,
        }},
    ]).to_list(10)

    # Daily upload trend (last N days)
    daily_uploads = await db.pdf_documents.aggregate([
        {"$match": {"is_deleted": {"$ne": True}, "created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]).to_list(365)

    # Role distribution
    role_distribution = await db.users.aggregate([
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)

    # Recent audit events
    recent_events = await db.audit_events.find().sort("created_at", -1).limit(20).to_list(20)

    return {
        "period_days": days,
        "pdfs": {
            "total": pdf_total,
            "approved": pdf_approved,
            "pending": pdf_pending,
            "rejected": pdf_rejected,
            "total_downloads": total_downloads,
            "recent_uploads": recent_uploads,
            "recent_approvals": recent_approvals,
        },
        "users": {
            "total": user_total,
            "active": user_active,
        },
        "charts": {
            "top_subjects": [{"subject": d["_id"], "count": d["count"]} for d in top_subjects],
            "top_colleges": [{"college": d["_id"], "count": d["count"]} for d in top_colleges],
            "top_downloaded": [
                {"id": str(d["_id"]), "title": d.get("title"), "downloads": d.get("downloads", 0)}
                for d in top_downloaded
            ],
            "daily_uploads": [{"date": d["_id"], "count": d["count"]} for d in daily_uploads],
            "role_distribution": [
                {"role": d["_id"], "count": d["count"]} for d in role_distribution
            ],
        },
        "recent_events": [
            {
                "id": str(e["_id"]),
                "event": e.get("event"),
                "user_id": e.get("user_id"),
                "email": e.get("email"),
                "created_at": e.get("created_at"),
            }
            for e in recent_events
        ],
    }


# ============================================================  BULK ACTIONS (PDFs)
class BulkActionPayload(BaseModel):
    action: str = Field(pattern="^(approve|reject|delete)$")
    ids: list[str] = Field(min_length=1, max_length=100)
    reason: Optional[str] = Field(None, min_length=5, max_length=500)


@router.post("/pdfs/bulk-action")
async def bulk_pdf_action(
    payload: BulkActionPayload,
    request: Request,
    actor: dict = Depends(require_permission("resource:approve")),
):
    """Bulk approve, reject, or delete multiple PDFs at once."""
    from security import record_event

    results = {"success": 0, "failed": 0, "errors": []}

    for pdf_id in payload.ids:
        try:
            doc = await db.pdf_documents.find_one({
                "_id": oid(pdf_id), "is_deleted": {"$ne": True}
            })
            if not doc:
                results["failed"] += 1
                results["errors"].append({"id": pdf_id, "error": "Not found"})
                continue

            if payload.action == "approve":
                # Cannot approve own uploads
                if doc.get("uploaded_by") == str(actor["_id"]):
                    results["failed"] += 1
                    results["errors"].append({"id": pdf_id, "error": "Cannot approve own upload"})
                    continue
                await db.pdf_documents.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "status": "approved",
                        "approved_by": str(actor["_id"]),
                        "approved_at": now_iso(),
                        "rejection_reason": None,
                        "updated_at": now_iso(),
                    }},
                )
                await record_event("pdf_bulk_approved", request, str(actor["_id"]),
                                   actor.get("email"), {"pdf_id": pdf_id})

            elif payload.action == "reject":
                if not payload.reason:
                    results["failed"] += 1
                    results["errors"].append({"id": pdf_id, "error": "Reason required"})
                    continue
                if doc.get("uploaded_by") == str(actor["_id"]):
                    results["failed"] += 1
                    results["errors"].append({"id": pdf_id, "error": "Cannot reject own upload"})
                    continue
                await db.pdf_documents.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "status": "rejected",
                        "approved_by": None,
                        "approved_at": None,
                        "rejection_reason": payload.reason.strip(),
                        "updated_at": now_iso(),
                    }},
                )
                await record_event("pdf_bulk_rejected", request, str(actor["_id"]),
                                   actor.get("email"), {"pdf_id": pdf_id})

            elif payload.action == "delete":
                await db.pdf_documents.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "is_deleted": True,
                        "status": "rejected",
                        "updated_at": now_iso(),
                    }},
                )
                await db.bookmarks.delete_many(
                    {"resource_id": str(doc["_id"]), "kind": "pdf"})
                await record_event("pdf_bulk_deleted", request, str(actor["_id"]),
                                   actor.get("email"), {"pdf_id": pdf_id})

            results["success"] += 1

        except (InvalidId, TypeError):
            results["failed"] += 1
            results["errors"].append({"id": pdf_id, "error": "Invalid ID"})
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": pdf_id, "error": str(e)})

    return results


# ============================================================  ANNOUNCEMENTS CRUD
@router.get("/announcements")
async def list_announcements(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = 0,
    user: dict = Depends(require_staff),
):
    filters = {"is_deleted": {"$ne": True}}
    if status:
        filters["status"] = status
    cursor = db.announcements.find(filters).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return {
        "items": [
            {
                "id": str(d["_id"]),
                "title": d.get("title"),
                "message": d.get("message"),
                "type": d.get("type", "info"),
                "priority": d.get("priority", "normal"),
                "status": d.get("status", "active"),
                "target_audience": d.get("target_audience", "all"),
                "publish_date": d.get("publish_date"),
                "expires_at": d.get("expires_at"),
                "created_by": d.get("created_by"),
                "created_at": d.get("created_at"),
            }
            for d in docs
        ],
        "total": await db.announcements.count_documents(filters),
    }


@router.post("/announcements", status_code=201)
async def create_announcement(
    body: dict = Body(...),
    user: dict = Depends(require_permission("catalog:write")),
):
    title = (body.get("title") or "").strip()
    message = (body.get("message") or "").strip()
    if not title or len(title) < 3:
        raise HTTPException(status_code=400, detail="Title is required (min 3 characters)")
    if not message or len(message) < 10:
        raise HTTPException(status_code=400, detail="Message is required (min 10 characters)")

    now = now_iso()
    doc = {
        "title": title,
        "message": message,
        "type": body.get("type", "info"),  # info, warning, success, urgent
        "priority": body.get("priority", "normal"),  # low, normal, high, urgent
        "status": body.get("status", "active"),
        "target_audience": body.get("target_audience", "all"),  # all, students, staff
        "publish_date": body.get("publish_date") or now,
        "expires_at": body.get("expires_at"),
        "link_url": (body.get("link_url") or "").strip() or None,
        "created_by": str(user["_id"]),
        "created_by_name": user.get("name"),
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.announcements.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.put("/announcements/{announcement_id}")
async def update_announcement(
    announcement_id: str,
    body: dict = Body(...),
    user: dict = Depends(require_permission("catalog:write")),
):
    doc = await db.announcements.find_one({
        "_id": oid(announcement_id), "is_deleted": {"$ne": True}
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updates = {}
    for field in ("title", "message", "type", "priority", "status",
                  "target_audience", "publish_date", "expires_at", "link_url"):
        if field in body:
            value = body[field]
            if isinstance(value, str):
                value = value.strip() or None
            updates[field] = value
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = now_iso()

    await db.announcements.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await db.announcements.find_one({"_id": doc["_id"]})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    user: dict = Depends(require_permission("catalog:delete")),
):
    result = await db.announcements.update_one(
        {"_id": oid(announcement_id), "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True, "status": "archived", "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement removed"}


# ============================================================  EXPORT PDF DATA
@router.get("/export/pdfs")
async def export_pdfs_csv(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected)$"),
    user: dict = Depends(require_permission("resource:read")),
):
    """Export PDF records as CSV for spreadsheet analysis."""
    filters = {"is_deleted": {"$ne": True}}
    if status:
        filters["status"] = status

    cursor = db.pdf_documents.find(filters).sort("uploaded_at", -1).limit(5000)
    docs = await cursor.to_list(5000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Title", "Subject", "Semester", "Session", "Status",
        "File Name", "File Size (bytes)", "College Name", "College Code",
        "Uploader Name", "Uploader Email", "Uploaded At", "Approved At",
        "Downloads", "Rejection Reason",
    ])

    for doc in docs:
        writer.writerow([
            str(doc["_id"]),
            doc.get("title", ""),
            doc.get("subject", ""),
            doc.get("semester", ""),
            doc.get("session", ""),
            doc.get("status", ""),
            doc.get("file_name", ""),
            doc.get("file_size", 0),
            doc.get("college_name", ""),
            doc.get("college_code", ""),
            doc.get("uploader_name", ""),
            doc.get("uploader_email", ""),
            doc.get("uploaded_at", ""),
            doc.get("approved_at", ""),
            doc.get("downloads", 0),
            doc.get("rejection_reason", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pdfs_export_{now_iso()[:10]}.csv"},
    )


# ============================================================  PLATFORM SETTINGS
@router.get("/settings")
async def get_settings(user: dict = Depends(require_staff)):
    """Read platform settings."""
    doc = await db.platform_settings.find_one({"_key": "general"})
    if not doc:
        return {
            "site_name": "CG Student Portal",
            "tagline": "Study • Earn • Grow",
            "maintenance_mode": False,
            "registration_open": True,
            "max_upload_size_mb": 100,
            "max_uploads_per_hour": 20,
            "require_email_verification": True,
            "allow_student_uploads": True,
            "auto_approve_from_verified": False,
            "contact_email": "",
            "support_url": "",
        }
    doc.pop("_id", None)
    doc.pop("_key", None)
    return doc


@router.put("/settings")
async def update_settings(
    body: dict = Body(...),
    user: dict = Depends(require_permission("system:manage")),
):
    """Update platform settings (super_admin only)."""
    allowed_fields = {
        "site_name", "tagline", "maintenance_mode", "registration_open",
        "max_upload_size_mb", "max_uploads_per_hour", "require_email_verification",
        "allow_student_uploads", "auto_approve_from_verified",
        "contact_email", "support_url",
    }
    updates = {}
    for key, value in body.items():
        if key in allowed_fields:
            updates[key] = value
    if not updates:
        raise HTTPException(status_code=400, detail="No valid settings provided")

    updates["updated_at"] = now_iso()
    updates["updated_by"] = str(user["_id"])

    await db.platform_settings.update_one(
        {"_key": "general"},
        {"$set": updates},
        upsert=True,
    )
    return {"message": "Settings updated", "updated": list(updates.keys())}


# ============================================================  RECENT ACTIVITY FEED
@router.get("/activity")
async def recent_activity(
    limit: int = Query(20, le=100),
    user: dict = Depends(require_staff),
):
    """Recent platform activity for the admin dashboard."""
    # Recent PDF uploads
    recent_pdfs = await db.pdf_documents.find(
        {"is_deleted": {"$ne": True}}
    ).sort("uploaded_at", -1).limit(10).to_list(10)

    # Recent user registrations
    recent_users = await db.users.find(
        {"is_deleted": {"$ne": True}}
    ).sort("created_at", -1).limit(10).to_list(10)

    # Recent audit events
    recent_events = await db.audit_events.find().sort("created_at", -1).limit(20).to_list(20)

    return {
        "recent_uploads": [
            {
                "id": str(d["_id"]),
                "title": d.get("title"),
                "status": d.get("status"),
                "uploader_name": d.get("uploader_name"),
                "uploaded_at": d.get("uploaded_at"),
            }
            for d in recent_pdfs
        ],
        "recent_users": [
            {
                "id": str(d["_id"]),
                "name": d.get("name"),
                "email": d.get("email"),
                "role": d.get("role"),
                "created_at": d.get("created_at"),
            }
            for d in recent_users
        ],
        "recent_events": [
            {
                "id": str(e["_id"]),
                "event": e.get("event"),
                "email": e.get("email"),
                "created_at": e.get("created_at"),
                "details": e.get("details"),
            }
            for e in recent_events
        ],
    }
