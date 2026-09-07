"""Notification system for in-app and email notifications."""
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/notifications", tags=["notifications"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================  NOTIFICATION TYPES
class NotificationType:
    PDF_APPROVED = "pdf_approved"
    PDF_REJECTED = "pdf_rejected"
    NEW_ANNOUNCEMENT = "new_announcement"
    WELCOME = "welcome"
    SYSTEM = "system"


async def create_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    """Create a notification for a user."""
    doc = {
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "link": link,
        "metadata": metadata or {},
        "read": False,
        "created_at": now_iso(),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ============================================================  GET NOTIFICATIONS
@router.get("")
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, le=100),
    skip: int = 0,
    user: dict = Depends(get_current_user),
):
    """Get user's notifications."""
    user_id = str(user["_id"])
    filters = {"user_id": user_id}
    if unread_only:
        filters["read"] = False

    cursor = db.notifications.find(filters).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.notifications.count_documents(filters)
    unread_count = await db.notifications.count_documents(
        {"user_id": user_id, "read": False}
    )

    return {
        "items": [
            {
                "id": str(d["_id"]),
                "type": d.get("type"),
                "title": d.get("title"),
                "message": d.get("message"),
                "link": d.get("link"),
                "read": d.get("read"),
                "created_at": d.get("created_at"),
            }
            for d in docs
        ],
        "total": total,
        "unread_count": unread_count,
    }


# ============================================================  MARK AS READ
@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark a notification as read."""
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(user["_id"])},
        {"$set": {"read": True, "read_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_as_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    await db.notifications.update_many(
        {"user_id": str(user["_id"]), "read": False},
        {"$set": {"read": True, "read_at": now_iso()}},
    )
    return {"message": "All notifications marked as read"}


# ============================================================  DELETE NOTIFICATION
@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a notification."""
    result = await db.notifications.delete_one(
        {"_id": ObjectId(notification_id), "user_id": str(user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}
