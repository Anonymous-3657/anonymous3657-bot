"""Rating and review system for resources and PDFs."""
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth import get_current_user
from database import db
from routers.catalog import oid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ratings", tags=["ratings"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================  SUBMIT RATING
@router.post("")
async def submit_rating(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Submit or update a rating for a resource or PDF."""
    resource_id = body.get("resource_id")
    pdf_id = body.get("pdf_id")
    rating = body.get("rating")
    review = (body.get("review") or "").strip()

    if not resource_id and not pdf_id:
        raise HTTPException(status_code=400, detail="Provide resource_id or pdf_id")
    if not rating or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    if len(review) > 1000:
        raise HTTPException(status_code=400, detail="Review too long (max 1000 characters)")

    user_id = str(user["_id"])
    target_type = "pdf" if pdf_id else "resource"
    target_id = pdf_id or resource_id

    # Check if already rated
    existing = await db.ratings.find_one({
        "user_id": user_id,
        "target_type": target_type,
        "target_id": target_id,
    })

    doc = {
        "user_id": user_id,
        "user_name": user.get("name"),
        "target_type": target_type,
        "target_id": target_id,
        "rating": int(rating),
        "review": review or None,
        "updated_at": now_iso(),
    }

    if existing:
        await db.ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": doc},
        )
        doc["_id"] = existing["_id"]
    else:
        doc["created_at"] = now_iso()
        result = await db.ratings.insert_one(doc)
        doc["_id"] = result.inserted_id

        # Update aggregate rating on target
        await _update_aggregate_rating(target_type, target_id)

    return {
        "id": str(doc["_id"]),
        "rating": doc["rating"],
        "review": doc.get("review"),
        "message": "Rating saved" if not existing else "Rating updated",
    }


async def _update_aggregate_rating(target_type: str, target_id: str):
    """Update average rating and count on the target document."""
    pipeline = [
        {"$match": {"target_type": target_type, "target_id": target_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1},
        }},
    ]
    result = await db.ratings.aggregate(pipeline).to_list(1)
    if result:
        avg = round(result[0]["avg_rating"], 1)
        count = result[0]["count"]
    else:
        avg = 0
        count = 0

    collection = db.pdf_documents if target_type == "pdf" else db.resources
    await collection.update_one(
        {"_id": oid(target_id)},
        {"$set": {
            "rating_average": avg,
            "rating_count": count,
            "updated_at": now_iso(),
        }},
    )


# ============================================================  GET RATINGS
@router.get("/pdf/{pdf_id}")
async def get_pdf_ratings(
    pdf_id: str,
    limit: int = Query(20, le=100),
    skip: int = 0,
):
    """Get all ratings for a PDF."""
    cursor = db.ratings.find({
        "target_type": "pdf",
        "target_id": pdf_id,
    }).sort("created_at", -1).skip(skip).limit(limit)

    docs = await cursor.to_list(limit)
    total = await db.ratings.count_documents({
        "target_type": "pdf",
        "target_id": pdf_id,
    })

    return {
        "items": [
            {
                "id": str(d["_id"]),
                "user_name": d.get("user_name"),
                "rating": d.get("rating"),
                "review": d.get("review"),
                "created_at": d.get("created_at"),
            }
            for d in docs
        ],
        "total": total,
    }


@router.get("/resource/{resource_id}")
async def get_resource_ratings(
    resource_id: str,
    limit: int = Query(20, le=100),
    skip: int = 0,
):
    """Get all ratings for a resource."""
    cursor = db.ratings.find({
        "target_type": "resource",
        "target_id": resource_id,
    }).sort("created_at", -1).skip(skip).limit(limit)

    docs = await cursor.to_list(limit)
    total = await db.ratings.count_documents({
        "target_type": "resource",
        "target_id": resource_id,
    })

    return {
        "items": [
            {
                "id": str(d["_id"]),
                "user_name": d.get("user_name"),
                "rating": d.get("rating"),
                "review": d.get("review"),
                "created_at": d.get("created_at"),
            }
            for d in docs
        ],
        "total": total,
    }


# ============================================================  DELETE RATING
@router.delete("/{rating_id}")
async def delete_rating(
    rating_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete own rating."""
    rating = await db.ratings.find_one({"_id": oid(rating_id)})
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    if rating["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own rating")

    await db.ratings.delete_one({"_id": rating["_id"]})
    await _update_aggregate_rating(rating["target_type"], rating["target_id"])
    return {"message": "Rating deleted"}
