"""Student profile and statistics endpoints."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response

from auth import get_current_user, hash_password, verify_password
from database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me", tags=["profile"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================  GET PROFILE
@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile."""
    user_id = str(user["_id"])

    # Get statistics
    upload_count = await db.pdf_documents.count_documents({
        "uploaded_by": user_id,
        "is_deleted": {"$ne": True},
    })
    approved_count = await db.pdf_documents.count_documents({
        "uploaded_by": user_id,
        "status": "approved",
        "is_deleted": {"$ne": True},
    })
    bookmark_count = await db.bookmarks.count_documents({"user_id": user_id})

    # Total downloads of user's PDFs
    download_agg = await db.pdf_documents.aggregate([
        {"$match": {"uploaded_by": user_id, "is_deleted": {"$ne": True}}},
        {"$group": {"_id": None, "total_downloads": {"$sum": "$downloads"}}},
    ]).to_list(1)
    total_downloads = download_agg[0]["total_downloads"] if download_agg else 0

    # Recent uploads
    recent_uploads = await db.pdf_documents.find({
        "uploaded_by": user_id,
        "is_deleted": {"$ne": True},
    }).sort("uploaded_at", -1).limit(5).to_list(5)

    return {
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": user.get("email"),
            "username": user.get("username"),
            "phone": user.get("phone"),
            "bio": user.get("bio"),
            "avatar_url": user.get("avatar_url"),
            "role": user.get("role"),
            "college_name": user.get("college_name"),
            "college_code": user.get("college_code"),
            "district": user.get("district"),
            "course_id": user.get("course_id"),
            "semester_or_year": user.get("semester_or_year"),
            "email_verified": user.get("email_verified"),
            "created_at": user.get("created_at"),
            "last_login_at": user.get("last_login_at"),
        },
        "stats": {
            "total_uploads": upload_count,
            "approved_uploads": approved_count,
            "pending_uploads": upload_count - approved_count,
            "total_downloads": total_downloads,
            "bookmark_count": bookmark_count,
        },
        "recent_uploads": [
            {
                "id": str(d["_id"]),
                "title": d.get("title"),
                "status": d.get("status"),
                "uploaded_at": d.get("uploaded_at"),
                "downloads": d.get("downloads", 0),
            }
            for d in recent_uploads
        ],
    }


# ============================================================  UPDATE PROFILE
@router.put("/profile")
async def update_profile(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Update user's profile."""
    updates = {}

    if "name" in body:
        name = (body.get("name") or "").strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        updates["name"] = name

    if "bio" in body:
        bio = (body.get("bio") or "").strip()
        if len(bio) > 500:
            raise HTTPException(status_code=400, detail="Bio must be 500 characters or less")
        updates["bio"] = bio or None

    if "phone" in body:
        phone = (body.get("phone") or "").strip()
        if phone and (len(phone) < 10 or len(phone) > 15):
            raise HTTPException(status_code=400, detail="Phone number must be 10-15 digits")
        updates["phone"] = phone or None

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = now_iso()
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})

    updated_user = await db.users.find_one({"_id": user["_id"]})
    return {
        "message": "Profile updated",
        "user": {
            "id": str(updated_user["_id"]),
            "name": updated_user.get("name"),
            "bio": updated_user.get("bio"),
            "phone": updated_user.get("phone"),
            "avatar_url": updated_user.get("avatar_url"),
        },
    }


# ============================================================  CHANGE PASSWORD
@router.put("/password")
async def change_password(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Change user's password."""
    current_password = body.get("current_password", "")
    new_password = body.get("new_password", "")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Both current and new passwords are required")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    if not verify_password(current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(new_password), "updated_at": now_iso()}},
    )
    return {"message": "Password changed successfully"}


# ============================================================  STUDY STATS
@router.get("/stats")
async def get_study_stats(user: dict = Depends(get_current_user)):
    """Get detailed study statistics for the student."""
    user_id = str(user["_id"])

    # Uploads by status
    upload_stats = await db.pdf_documents.aggregate([
        {"$match": {"uploaded_by": user_id, "is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(10)

    # Downloads by month
    monthly_downloads = await db.pdf_documents.aggregate([
        {"$match": {"uploaded_by": user_id, "is_deleted": {"$ne": True}}},
        {"$group": {
            "_id": {"$substr": ["$uploaded_at", 0, 7]},
            "count": {"$sum": 1},
            "downloads": {"$sum": "$downloads"},
        }},
        {"$sort": {"_id": -1}},
    ]).to_list(12)

    # Top subjects
    top_subjects = await db.pdf_documents.aggregate([
        {"$match": {"uploaded_by": user_id, "status": "approved", "is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$subject", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)

    return {
        "uploads_by_status": {d["_id"]: d["count"] for d in upload_stats},
        "monthly_activity": [
            {"month": d["_id"], "uploads": d["count"], "downloads": d["downloads"]}
            for d in monthly_downloads
        ],
        "top_subjects": [
            {"subject": d["_id"], "count": d["count"]}
            for d in top_subjects
        ],
    }
