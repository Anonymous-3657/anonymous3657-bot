"""Comments system for resources and PDFs."""
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth import get_current_user
from database import db
from routers.catalog import oid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comments", tags=["comments"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================  ADD COMMENT
@router.post("")
async def add_comment(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Add a comment to a resource or PDF."""
    resource_id = body.get("resource_id")
    pdf_id = body.get("pdf_id")
    content = (body.get("content") or "").strip()
    parent_id = body.get("parent_id")  # For replies

    if not resource_id and not pdf_id:
        raise HTTPException(status_code=400, detail="Provide resource_id or pdf_id")
    if len(content) < 3:
        raise HTTPException(status_code=400, detail="Comment too short (min 3 characters)")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Comment too long (max 2000 characters)")

    user_id = str(user["_id"])
    target_type = "pdf" if pdf_id else "resource"
    target_id = pdf_id or resource_id

    doc = {
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_avatar": user.get("avatar_url"),
        "target_type": target_type,
        "target_id": target_id,
        "content": content,
        "parent_id": parent_id,
        "upvotes": 0,
        "downvotes": 0,
        "is_deleted": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    result = await db.comments.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update comment count on target
    collection = db.pdf_documents if target_type == "pdf" else db.resources
    await collection.update_one(
        {"_id": oid(target_id)},
        {"$inc": {"comment_count": 1}, "$set": {"updated_at": now_iso()}},
    )

    return {
        "id": str(doc["_id"]),
        "user_name": doc["user_name"],
        "content": doc["content"],
        "created_at": doc["created_at"],
        "message": "Comment added",
    }


# ============================================================  GET COMMENTS
@router.get("/pdf/{pdf_id}")
async def get_pdf_comments(
    pdf_id: str,
    limit: int = Query(50, le=200),
    skip: int = 0,
    sort: str = Query("recent", pattern="^(recent|popular)$"),
):
    """Get comments for a PDF."""
    filters = {
        "target_type": "pdf",
        "target_id": pdf_id,
        "parent_id": None,
        "is_deleted": False,
    }

    sort_field = "created_at" if sort == "recent" else "upvotes"
    cursor = db.comments.find(filters).sort(sort_field, -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    # Get replies for each comment
    comments = []
    for doc in docs:
        replies_cursor = db.comments.find({
            "parent_id": str(doc["_id"]),
            "is_deleted": False,
        }).sort("created_at", 1).limit(50)
        replies = await replies_cursor.to_list(50)

        comments.append({
            "id": str(doc["_id"]),
            "user_name": doc.get("user_name"),
            "user_avatar": doc.get("user_avatar"),
            "content": doc.get("content"),
            "upvotes": doc.get("upvotes", 0),
            "downvotes": doc.get("downvotes", 0),
            "created_at": doc.get("created_at"),
            "replies": [
                {
                    "id": str(r["_id"]),
                    "user_name": r.get("user_name"),
                    "content": r.get("content"),
                    "created_at": r.get("created_at"),
                }
                for r in replies
            ],
        })

    total = await db.comments.count_documents(filters)
    return {"items": comments, "total": total}


@router.get("/resource/{resource_id}")
async def get_resource_comments(
    resource_id: str,
    limit: int = Query(50, le=200),
    skip: int = 0,
    sort: str = Query("recent", pattern="^(recent|popular)$"),
):
    """Get comments for a resource."""
    filters = {
        "target_type": "resource",
        "target_id": resource_id,
        "parent_id": None,
        "is_deleted": False,
    }

    sort_field = "created_at" if sort == "recent" else "upvotes"
    cursor = db.comments.find(filters).sort(sort_field, -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    comments = []
    for doc in docs:
        replies_cursor = db.comments.find({
            "parent_id": str(doc["_id"]),
            "is_deleted": False,
        }).sort("created_at", 1).limit(50)
        replies = await replies_cursor.to_list(50)

        comments.append({
            "id": str(doc["_id"]),
            "user_name": doc.get("user_name"),
            "user_avatar": doc.get("user_avatar"),
            "content": doc.get("content"),
            "upvotes": doc.get("upvotes", 0),
            "downvotes": doc.get("downvotes", 0),
            "created_at": doc.get("created_at"),
            "replies": [
                {
                    "id": str(r["_id"]),
                    "user_name": r.get("user_name"),
                    "content": r.get("content"),
                    "created_at": r.get("created_at"),
                }
                for r in replies
            ],
        })

    total = await db.comments.count_documents(filters)
    return {"items": comments, "total": total}


# ============================================================  VOTE ON COMMENT
@router.post("/{comment_id}/vote")
async def vote_comment(
    comment_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Upvote or downvote a comment."""
    vote_type = body.get("vote_type")  # "up" or "down"
    if vote_type not in ("up", "down"):
        raise HTTPException(status_code=400, detail="vote_type must be 'up' or 'down'")

    comment = await db.comments.find_one({"_id": oid(comment_id), "is_deleted": False})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = str(user["_id"])
    vote_key = f"{vote_type}votes"

    # Check if user already voted
    existing_vote = await db.comment_votes.find_one({
        "user_id": user_id,
        "comment_id": str(comment["_id"]),
    })

    if existing_vote:
        if existing_vote["vote_type"] == vote_type:
            # Remove vote
            await db.comment_votes.delete_one({"_id": existing_vote["_id"]})
            await db.comments.update_one(
                {"_id": comment["_id"]},
                {"$inc": {vote_key: -1}},
            )
            return {"message": "Vote removed", "vote_type": None}
        else:
            # Change vote
            await db.comment_votes.update_one(
                {"_id": existing_vote["_id"]},
                {"$set": {"vote_type": vote_type}},
            )
            old_key = "upvotes" if vote_type == "down" else "downvotes"
            await db.comments.update_one(
                {"_id": comment["_id"]},
                {"$inc": {old_key: -1, vote_key: 1}},
            )
            return {"message": "Vote changed", "vote_type": vote_type}
    else:
        # New vote
        await db.comment_votes.insert_one({
            "user_id": user_id,
            "comment_id": str(comment["_id"]),
            "vote_type": vote_type,
            "created_at": now_iso(),
        })
        await db.comments.update_one(
            {"_id": comment["_id"]},
            {"$inc": {vote_key: 1}},
        )
        return {"message": "Vote added", "vote_type": vote_type}


# ============================================================  DELETE COMMENT
@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete own comment."""
    comment = await db.comments.find_one({"_id": oid(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = str(user["_id"])
    # Allow user to delete own comment or admin to delete any
    is_owner = comment["user_id"] == user_id
    is_admin = user.get("role") in ("admin", "super_admin", "moderator")

    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    await db.comments.update_one(
        {"_id": comment["_id"]},
        {"$set": {"is_deleted": True, "updated_at": now_iso()}},
    )

    # Update comment count on target
    collection = db.pdf_documents if comment["target_type"] == "pdf" else db.resources
    await collection.update_one(
        {"_id": oid(comment["target_id"])},
        {"$inc": {"comment_count": -1}, "$set": {"updated_at": now_iso()}},
    )

    return {"message": "Comment deleted"}
