"""Student-owned features: bookmarks (saved resources and approved PDFs)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user
from database import db
from routers.catalog import ACTIVE, oid
from routers.pdfs import public_doc
from routers.resources import _hydrate

router = APIRouter(prefix="/me", tags=["student"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BookmarkPayload(BaseModel):
    resource_id: str | None = None
    pdf_id: str | None = None


@router.get("/bookmarks")
async def list_bookmarks(
    skip: int = 0,
    limit: int = Query(24, le=100),
    user: dict = Depends(get_current_user),
):
    filters = {"user_id": str(user["_id"]), "kind": {"$ne": "pdf"}}
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


@router.get("/bookmarks/pdfs")
async def list_pdf_bookmarks(user: dict = Depends(get_current_user)):
    filters = {"user_id": str(user["_id"]), "kind": "pdf"}
    saved = await db.bookmarks.find(filters).sort("created_at", -1).to_list(100)
    ids = [oid(b["resource_id"]) for b in saved]
    docs = []
    if ids:
        docs = await db.pdf_documents.find({
            "_id": {"$in": ids}, "status": "approved", "is_deleted": {"$ne": True},
        }).to_list(len(ids))
        order = {b["resource_id"]: i for i, b in enumerate(saved)}
        docs.sort(key=lambda d: order.get(str(d["_id"]), 0))
    return {"items": [public_doc(d) for d in docs], "total": len(docs)}


@router.get("/bookmarks/ids")
async def bookmark_ids(user: dict = Depends(get_current_user)):
    cursor = db.bookmarks.find({"user_id": str(user["_id"])}, {"resource_id": 1, "_id": 0})
    return {"ids": [b["resource_id"] for b in await cursor.to_list(500)]}


@router.post("/bookmarks", status_code=201)
async def add_bookmark(payload: BookmarkPayload, user: dict = Depends(get_current_user)):
    if payload.pdf_id:
        item = await db.pdf_documents.find_one({
            "_id": oid(payload.pdf_id), "status": "approved", "is_deleted": {"$ne": True},
        })
        kind = "pdf"
        if not item:
            raise HTTPException(status_code=404, detail="Document not found")
    elif payload.resource_id:
        item = await db.resources.find_one({"_id": oid(payload.resource_id), **ACTIVE})
        kind = "resource"
        if not item:
            raise HTTPException(status_code=404, detail="Resource not found")
    else:
        raise HTTPException(status_code=400, detail="Nothing to save")

    # Ownership is taken from the session, never from the request body.
    await db.bookmarks.update_one(
        {"user_id": str(user["_id"]), "resource_id": str(item["_id"])},
        {"$setOnInsert": {
            "user_id": str(user["_id"]),
            "resource_id": str(item["_id"]),
            "kind": kind,
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    return {"message": "Saved to your shelf", "id": str(item["_id"]), "kind": kind}


@router.delete("/bookmarks/{resource_id}")
async def remove_bookmark(resource_id: str, user: dict = Depends(get_current_user)):
    result = await db.bookmarks.delete_one(
        {"user_id": str(user["_id"]), "resource_id": str(oid(resource_id))}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="That resource is not on your shelf")
    return {"message": "Removed from your shelf"}
