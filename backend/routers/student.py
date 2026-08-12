"""Student-owned features: bookmarks (saved resources)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user
from database import db
from routers.catalog import ACTIVE, oid
from routers.resources import _hydrate

router = APIRouter(prefix="/me", tags=["student"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BookmarkPayload(BaseModel):
    resource_id: str


@router.get("/bookmarks")
async def list_bookmarks(
    skip: int = 0,
    limit: int = Query(24, le=100),
    user: dict = Depends(get_current_user),
):
    filters = {"user_id": str(user["_id"])}
    cursor = db.bookmarks.find(filters).sort("created_at", -1).skip(skip).limit(limit)
    saved = await cursor.to_list(limit)

    resource_ids = [oid(b["resource_id"]) for b in saved]
    docs = []
    if resource_ids:
        docs = await db.resources.find(
            {"_id": {"$in": resource_ids}, **ACTIVE}
        ).to_list(len(resource_ids))
        order = {b["resource_id"]: i for i, b in enumerate(saved)}
        docs.sort(key=lambda d: order.get(str(d["_id"]), 0))

    return {
        "items": await _hydrate(docs),
        "total": await db.bookmarks.count_documents(filters),
        "skip": skip,
        "limit": limit,
    }


@router.get("/bookmarks/ids")
async def bookmark_ids(user: dict = Depends(get_current_user)):
    cursor = db.bookmarks.find({"user_id": str(user["_id"])}, {"resource_id": 1, "_id": 0})
    return {"ids": [b["resource_id"] for b in await cursor.to_list(500)]}


@router.post("/bookmarks", status_code=201)
async def add_bookmark(payload: BookmarkPayload, user: dict = Depends(get_current_user)):
    resource = await db.resources.find_one({"_id": oid(payload.resource_id), **ACTIVE})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Ownership is taken from the session, never from the request body.
    await db.bookmarks.update_one(
        {"user_id": str(user["_id"]), "resource_id": str(resource["_id"])},
        {"$setOnInsert": {
            "user_id": str(user["_id"]),
            "resource_id": str(resource["_id"]),
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    return {"message": "Saved to your shelf", "resource_id": str(resource["_id"])}


@router.delete("/bookmarks/{resource_id}")
async def remove_bookmark(resource_id: str, user: dict = Depends(get_current_user)):
    result = await db.bookmarks.delete_one(
        {"user_id": str(user["_id"]), "resource_id": str(oid(resource_id))}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="That resource is not on your shelf")
    return {"message": "Removed from your shelf"}
