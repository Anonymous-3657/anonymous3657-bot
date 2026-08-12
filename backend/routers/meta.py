"""Platform meta: health, stats, global search, SEO helpers."""
from fastapi import APIRouter, Query

from database import db
from models import Resource, University
from routers.catalog import ACTIVE

router = APIRouter(tags=["meta"])


@router.get("/health")
async def health():
    await db.command("ping")
    return {"status": "ok"}


@router.get("/stats")
async def stats():
    return {
        "universities": await db.universities.count_documents(ACTIVE),
        "colleges": await db.colleges.count_documents(ACTIVE),
        "courses": await db.courses.count_documents(ACTIVE),
        "subjects": await db.subjects.count_documents(ACTIVE),
        "resources": await db.resources.count_documents(ACTIVE),
        "is_demo_data": True,
    }


@router.get("/search")
async def global_search(q: str = Query(..., min_length=2, max_length=80), limit: int = 5):
    rx = {"$regex": q.strip(), "$options": "i"}
    resources = await db.resources.find({"title": rx, **ACTIVE}).limit(limit).to_list(limit)
    universities = await db.universities.find({"name": rx, **ACTIVE}).limit(limit).to_list(limit)
    subjects = await db.subjects.find({"name": rx, **ACTIVE}).limit(limit).to_list(limit)
    courses = await db.courses.find({"name": rx, **ACTIVE}).limit(limit).to_list(limit)
    return {
        "query": q,
        "resources": [{"title": r["title"], "slug": r["slug"]} for r in resources],
        "universities": [University.from_mongo(u).model_dump() for u in universities],
        "subjects": [{"name": s["name"], "id": str(s["_id"])} for s in subjects],
        "courses": [{"name": c["name"], "slug": c["slug"]} for c in courses],
    }


@router.get("/sitemap-entries")
async def sitemap_entries():
    unis = await db.universities.find(ACTIVE, {"slug": 1, "updated_at": 1}).to_list(1000)
    courses = await db.courses.find(ACTIVE, {"slug": 1, "updated_at": 1}).to_list(1000)
    resources = await db.resources.find(ACTIVE, {"slug": 1, "updated_at": 1}).to_list(1000)
    def fmt(prefix, docs):
        return [{"loc": f"{prefix}/{d['slug']}", "lastmod": d.get("updated_at")} for d in docs]
    return {"entries": fmt("/universities", unis) + fmt("/courses", courses) + fmt("/resources", resources)}
