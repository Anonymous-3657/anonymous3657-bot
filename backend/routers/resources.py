"""Read-only resource APIs. Upload/approval/download land in Step 4."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import db
from models import Resource
from routers.catalog import ACTIVE, oid

router = APIRouter(tags=["resources"])


async def _hydrate(docs: list[dict]) -> list[dict]:
    """Attach related names using one batched lookup per relation."""
    def ids(field):
        return list({d[field] for d in docs if d.get(field)})

    async def name_map(collection, field):
        raw = ids(field)
        if not raw:
            return {}
        objs = [oid(v) for v in raw]
        cursor = collection.find({"_id": {"$in": objs}}, {"name": 1, "slug": 1})
        return {str(d["_id"]): d for d in await cursor.to_list(len(objs))}

    unis = await name_map(db.universities, "university_id")
    courses = await name_map(db.courses, "course_id")
    subjects = await name_map(db.subjects, "subject_id")
    cats = await name_map(db.categories, "category_id")

    out = []
    for d in docs:
        item = Resource.from_mongo(d).model_dump()
        item["university"] = unis.get(d.get("university_id"), {}).get("name")
        item["course"] = courses.get(d.get("course_id"), {}).get("name")
        item["subject"] = subjects.get(d.get("subject_id"), {}).get("name")
        item["category"] = cats.get(d.get("category_id"), {}).get("name")
        item.pop("file_url", None)
        out.append(item)
    return out


@router.get("/resources")
async def list_resources(
    q: Optional[str] = None,
    university_id: Optional[str] = None,
    course_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    category_id: Optional[str] = None,
    year: Optional[int] = None,
    file_type: Optional[str] = None,
    sort: str = Query("recent", pattern="^(recent|popular|downloads)$"),
    skip: int = 0,
    limit: int = Query(12, le=48),
):
    filters = dict(ACTIVE)
    for field, value in (
        ("university_id", university_id),
        ("course_id", course_id),
        ("subject_id", subject_id),
        ("category_id", category_id),
    ):
        if value:
            filters[field] = str(oid(value))
    if year:
        filters["year"] = year
    if file_type:
        filters["file_type"] = file_type
    if q:
        filters["title"] = {"$regex": q.strip()[:100], "$options": "i"}

    sort_field = {"recent": "created_at", "popular": "views", "downloads": "downloads"}[sort]
    cursor = db.resources.find(filters).sort(sort_field, -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return {
        "items": await _hydrate(docs),
        "total": await db.resources.count_documents(filters),
        "skip": skip,
        "limit": limit,
    }


@router.get("/resources/{slug}")
async def get_resource(slug: str):
    doc = await db.resources.find_one({"slug": slug, **ACTIVE})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    items = await _hydrate([doc])
    return items[0]
