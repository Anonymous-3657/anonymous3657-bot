"""Teacher-authored content: admin CRUD and public browsing endpoints."""
import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile

from auth import require_permission, require_staff
from database import db
from security import record_event
from storage import put_object, get_object

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teacher-content", tags=["teacher-content"])
admin_router = APIRouter(prefix="/admin/teacher-content", tags=["teacher-content-admin"], dependencies=[Depends(require_staff)])

PUBLISHED = "published"
DRAFT = "draft"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_segment(value: str, fallback: str = "item") -> str:
    text = re.sub(r"[^a-zA-Z0-9._-]+", "-", (value or "").strip())
    text = text.strip(".-")
    return text[:80] or fallback


def public_content(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "teacher_id": str(doc.get("teacher_id")) if doc.get("teacher_id") else None,
        "content_type": doc.get("content_type"),
        "title": doc.get("title"),
        "excerpt": doc.get("excerpt"),
        "content_html": doc.get("content_html"),
        "cover_image_url": doc.get("cover_image_url"),
        "image_urls": doc.get("image_urls"),
        "tags": doc.get("tags"),
        "featured": bool(doc.get("featured")),
        "status": doc.get("status"),
        "published_at": doc.get("published_at"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@admin_router.get("", response_model=None)
async def admin_list_contents(
    q: Optional[str] = None,
    content_type: Optional[str] = None,
    university_id: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    actor: dict = Depends(require_permission("resource:read")),
):
    filters = {"is_deleted": {"$ne": True}}
    if q:
        term = q.strip()[:200]
        filters["$or"] = [{"title": {"$regex": term, "$options": "i"}}, {"excerpt": {"$regex": term, "$options": "i"}}]
    if content_type:
        filters["content_type"] = content_type
    if university_id:
        filters["university_id"] = university_id
    cursor = db.teacher_content.find(filters).sort("created_at", -1).skip(skip).limit(limit)
    items = [public_content(d) for d in await cursor.to_list(limit)]
    return {"items": items, "total": await db.teacher_content.count_documents(filters), "skip": skip, "limit": limit}


@admin_router.post("/teachers", status_code=201)
async def create_teacher(
    request: Request,
    name: str = Form(...),
    designation: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    university_id: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    actor: dict = Depends(require_permission("resource:write")),
):
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Teacher name is required")
    doc = {
        "name": name,
        "designation": (designation or "").strip() or None,
        "institution": (institution or "").strip() or None,
        "university_id": (university_id or None),
        "bio": (bio or "").strip() or None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status": DRAFT,
        "is_deleted": False,
    }
    if photo is not None:
        filename = (photo.filename or "").strip()
        if filename and not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Only image files are allowed for teacher photo")
        data = await photo.read()
        if data:
            file_id = uuid.uuid4().hex
            path = f"teacher-content/teachers/{safe_segment(name)}/{file_id}.jpg"
            try:
                put_object(path, data, "image/jpeg")
                doc["photo_url"] = f"/api/teacher-content/objects/{path}"
            except Exception:
                logger.exception("Failed to upload teacher photo")
                raise HTTPException(status_code=502, detail="Storage unavailable")

    res = await db.teachers.insert_one(doc)
    await record_event("teacher_created", request, str(actor["_id"]), actor.get("email"), {"teacher_id": str(res.inserted_id)})
    doc["_id"] = res.inserted_id
    return {"id": str(res.inserted_id), "name": name}


@admin_router.post("", status_code=201)
async def create_content(
    request: Request,
    teacher_id: Optional[str] = Form(None),
    content_type: str = Form(...),
    title: str = Form(...),
    excerpt: Optional[str] = Form(None),
    content_html: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    featured: bool = Form(False),
    cover_image: UploadFile = File(None),
    images: list[UploadFile] = File(None),
    status: str = Form(PUBLISHED),
    published_at: Optional[str] = Form(None),
    actor: dict = Depends(require_permission("resource:write")),
):
    title = (title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    doc = {
        "teacher_id": teacher_id,
        "content_type": content_type,
        "title": title,
        "excerpt": (excerpt or "").strip() or None,
        "content_html": (content_html or "").strip() or None,
        "tags": [t.strip() for t in (tags or "").split(",") if t.strip()] if tags else [],
        "featured": bool(featured),
        "status": status,
        "published_at": published_at or (now_iso() if status == PUBLISHED else None),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "is_deleted": False,
    }
    # handle cover image
    if cover_image is not None:
        filename = (cover_image.filename or "").strip()
        if filename and not filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Only image files allowed")
        data = await cover_image.read()
        if data:
            file_id = uuid.uuid4().hex
            path = f"teacher-content/articles/{safe_segment(title)}/{file_id}.jpg"
            try:
                put_object(path, data, "image/jpeg")
                doc["cover_image_url"] = f"/api/teacher-content/objects/{path}"
            except Exception:
                logger.exception("Failed to upload cover image")
                raise HTTPException(status_code=502, detail="Storage unavailable")

    # handle additional images
    imgs = []
    if images:
        for im in images:
            if not im:
                continue
            fn = (im.filename or "").strip()
            if fn and not fn.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            data = await im.read()
            if data:
                file_id = uuid.uuid4().hex
                path = f"teacher-content/images/{safe_segment(title)}/{file_id}.jpg"
                try:
                    put_object(path, data, "image/jpeg")
                    imgs.append(f"/api/teacher-content/objects/{path}")
                except Exception:
                    logger.exception("Failed to upload extra image")
    if imgs:
        doc["image_urls"] = imgs

    res = await db.teacher_content.insert_one(doc)
    await record_event("teacher_content_created", request, str(actor["_id"]), actor.get("email"), {"content_id": str(res.inserted_id)})
    return public_content({**doc, "_id": res.inserted_id})


@router.get("")
async def public_list(content_type: Optional[str] = None, teacher: Optional[str] = None, q: Optional[str] = None, skip: int = 0, limit: int = Query(24, le=200)):
    filters = {"status": PUBLISHED, "is_deleted": {"$ne": True}}
    if content_type:
        filters["content_type"] = content_type
    if teacher:
        filters["teacher_id"] = teacher
    if q:
        term = q.strip()[:200]
        filters["$or"] = [{"title": {"$regex": term, "$options": "i"}}, {"excerpt": {"$regex": term, "$options": "i"}}]
    cursor = db.teacher_content.find(filters).sort([("featured", -1), ("published_at", -1)]).skip(skip).limit(limit)
    items = [public_content(d) for d in await cursor.to_list(limit)]
    return {"items": items, "total": await db.teacher_content.count_documents(filters), "skip": skip, "limit": limit}


@router.get("/{content_id}")
async def public_detail(content_id: str):
    from routers.catalog import oid
    doc = await db.teacher_content.find_one({"_id": oid(content_id), "is_deleted": {"$ne": True}, "status": PUBLISHED})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    return public_content(doc)


@router.get("/teachers/{teacher_id}")
async def public_teacher_profile(teacher_id: str):
    from routers.catalog import oid
    t = await db.teachers.find_one({"_id": oid(teacher_id), "is_deleted": {"$ne": True}})
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    contents = [public_content(d) async for d in db.teacher_content.find({"teacher_id": str(t["_id"]), "status": PUBLISHED, "is_deleted": {"$ne": True}}).sort("published_at", -1).to_list(200)]
    tobj = {"id": str(t["_id"]), "name": t.get("name"), "photo_url": t.get("photo_url"), "designation": t.get("designation"), "institution": t.get("institution"), "bio": t.get("bio"), "contents": contents}
    return tobj


@router.get("/objects/{path:path}")
async def get_object_proxy(path: str):
    try:
        data, content_type = get_object(path)
    except Exception:
        logger.exception("Failed to read object %s", path)
        raise HTTPException(status_code=502, detail="File unavailable")
    return Response(content=data, media_type=content_type or "application/octet-stream")


@admin_router.put("/{content_id}")
async def update_content(content_id: str, request: Request, title: Optional[str] = Form(None), excerpt: Optional[str] = Form(None), content_html: Optional[str] = Form(None), tags: Optional[str] = Form(None), featured: Optional[bool] = Form(None), status: Optional[str] = Form(None), cover_image: UploadFile = File(None), images: list[UploadFile] = File(None), actor: dict = Depends(require_permission("resource:write"))):
    from routers.catalog import oid
    doc = await db.teacher_content.find_one({"_id": oid(content_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    payload = {"updated_at": now_iso()}
    if title is not None:
        payload["title"] = title.strip() or doc.get("title")
    if excerpt is not None:
        payload["excerpt"] = excerpt.strip() or None
    if content_html is not None:
        payload["content_html"] = content_html.strip() or None
    if tags is not None:
        payload["tags"] = [t.strip() for t in tags.split(",") if t.strip()]
    if featured is not None:
        payload["featured"] = bool(featured)
    if status is not None:
        payload["status"] = status
        if status == PUBLISHED and not doc.get("published_at"):
            payload["published_at"] = now_iso()

    # cover image replacement
    if cover_image is not None:
        data = await cover_image.read()
        if data:
            file_id = uuid.uuid4().hex
            path = f"teacher-content/articles/{safe_segment(payload.get('title', doc.get('title')) )}/{file_id}.jpg"
            try:
                put_object(path, data, "image/jpeg")
                payload["cover_image_url"] = f"/api/teacher-content/objects/{path}"
            except Exception:
                logger.exception("Failed to upload cover image")
                raise HTTPException(status_code=502, detail="Storage unavailable")

    # additional images append
    imgs = doc.get("image_urls", []) or []
    if images:
        for im in images:
            if not im:
                continue
            data = await im.read()
            if data:
                file_id = uuid.uuid4().hex
                path = f"teacher-content/images/{safe_segment(payload.get('title', doc.get('title')) )}/{file_id}.jpg"
                try:
                    put_object(path, data, "image/jpeg")
                    imgs.append(f"/api/teacher-content/objects/{path}")
                except Exception:
                    logger.exception("Failed to upload extra image")
    if imgs:
        payload["image_urls"] = imgs

    await db.teacher_content.update_one({"_id": doc["_id"]}, {"$set": payload})
    await record_event("teacher_content_updated", request, str(actor["_id"]), actor.get("email"), {"content_id": content_id})
    return public_content(await db.teacher_content.find_one({"_id": doc["_id"]}))


@admin_router.post("/{content_id}/publish")
async def publish_content(content_id: str, request: Request, actor: dict = Depends(require_permission("resource:write"))):
    from routers.catalog import oid
    doc = await db.teacher_content.find_one({"_id": oid(content_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    await db.teacher_content.update_one({"_id": doc["_id"]}, {"$set": {"status": PUBLISHED, "published_at": now_iso(), "updated_at": now_iso()}})
    await record_event("teacher_content_published", request, str(actor["_id"]), actor.get("email"), {"content_id": content_id})
    return {"message": "Published"}


@admin_router.post("/{content_id}/unpublish")
async def unpublish_content(content_id: str, request: Request, actor: dict = Depends(require_permission("resource:write"))):
    from routers.catalog import oid
    doc = await db.teacher_content.find_one({"_id": oid(content_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    await db.teacher_content.update_one({"_id": doc["_id"]}, {"$set": {"status": DRAFT, "updated_at": now_iso()}})
    await record_event("teacher_content_unpublished", request, str(actor["_id"]), actor.get("email"), {"content_id": content_id})
    return {"message": "Unpublished"}


@admin_router.delete("/{content_id}")
async def delete_content(content_id: str, request: Request, actor: dict = Depends(require_permission("resource:delete"))):
    from routers.catalog import oid
    doc = await db.teacher_content.find_one({"_id": oid(content_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    await db.teacher_content.update_one({"_id": doc["_id"]}, {"$set": {"is_deleted": True, "status": DRAFT, "updated_at": now_iso()}})
    await record_event("teacher_content_deleted", request, str(actor["_id"]), actor.get("email"), {"content_id": content_id})
    return {"message": "Deleted"}
