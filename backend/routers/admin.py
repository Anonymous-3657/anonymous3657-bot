"""Admin CRUD for the catalog, resources and users.

Every collection declares an explicit writable field whitelist — request bodies are
never mass-assigned, so role/tenant/ownership fields cannot be injected.
"""
import re
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError

from auth import (ROLE_PERMISSIONS, ROLE_RANK, get_current_user, hash_password,
                  public_user, require_permission, require_staff)
from database import db
from routers.catalog import oid

# Every admin endpoint sits behind the staff gate as well as its own permission.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_staff)])

BOOL_FIELDS = {"is_premium", "is_verified", "is_demo"}
INT_FIELDS = {"year", "file_size", "views", "downloads"}

SCHEMAS = {
    "states": {
        "collection": "states",
        "fields": ["name", "code", "country_code", "status"],
        "required": ["name", "code"],
    },
    "universities": {
        "collection": "universities",
        "fields": ["state_id", "name", "short_name", "slug", "logo_url", "banner_url",
                   "description", "official_website", "official_result_url",
                   "official_notice_url", "status"],
        "required": ["name"],
        "slug_from": "name",
    },
    "colleges": {
        "collection": "colleges",
        "fields": ["university_id", "name", "slug", "logo_url", "address", "city",
                   "description", "status"],
        "required": ["name", "university_id"],
        "slug_from": "name",
    },
    "courses": {
        "collection": "courses",
        "fields": ["university_id", "name", "short_name", "slug", "course_type",
                   "duration", "status"],
        "required": ["name", "university_id"],
        "slug_from": "name",
    },
    "subjects": {
        "collection": "subjects",
        "fields": ["course_id", "name", "code", "semester_or_year", "description", "status"],
        "required": ["name", "course_id"],
    },
    "categories": {
        "collection": "categories",
        "fields": ["name", "slug", "description", "icon", "status"],
        "required": ["name"],
        "slug_from": "name",
    },
    "resources": {
        "collection": "resources",
        "fields": ["university_id", "college_id", "course_id", "subject_id", "category_id",
                   "title", "slug", "description", "preview_url", "thumbnail_url",
                   "file_size", "file_type", "year", "language", "is_premium",
                   "is_verified", "status"],
        "required": ["title"],
        "slug_from": "title",
    },
}

PERMISSION_FOR = {"resources": "resource", "default": "catalog"}


def slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return s or "item"


def schema_or_404(entity: str) -> dict:
    schema = SCHEMAS.get(entity)
    if not schema:
        raise HTTPException(status_code=404, detail="Unknown entity")
    return schema


def permission(entity: str, action: str) -> str:
    scope = PERMISSION_FOR.get(entity, PERMISSION_FOR["default"])
    return f"{scope}:{action}"


async def ensure_permission(entity: str, action: str, user: dict):
    perm = permission(entity, action)
    if perm not in ROLE_PERMISSIONS.get(user.get("role", "student"), set()):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


def clean_payload(schema: dict, body: dict, partial: bool) -> dict:
    data = {}
    for field in schema["fields"]:
        if field not in body:
            continue
        value = body[field]
        if isinstance(value, str):
            value = value.strip()
            if value == "":
                value = None
        if field in BOOL_FIELDS:
            value = bool(value)
        elif field in INT_FIELDS and value is not None:
            try:
                value = int(value)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail=f"{field} must be a number")
        data[field] = value

    if not partial:
        for field in schema["required"]:
            if not data.get(field):
                raise HTTPException(status_code=400, detail=f"{field} is required")
    return data


@router.get("/entities/{entity}")
async def list_entity(
    entity: str,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
):
    schema = schema_or_404(entity)
    await ensure_permission(entity, "read", user)
    filters = {"is_deleted": {"$ne": True}}
    if q:
        key = "title" if entity == "resources" else "name"
        filters[key] = {"$regex": re.escape(q.strip()[:80]), "$options": "i"}
    cursor = db[schema["collection"]].find(filters).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    for doc in await cursor.to_list(limit):
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    return {
        "items": items,
        "total": await db[schema["collection"]].count_documents(filters),
        "skip": skip,
        "limit": limit,
    }


@router.post("/entities/{entity}", status_code=201)
async def create_entity(entity: str, body: dict = Body(...), user: dict = Depends(get_current_user)):
    schema = schema_or_404(entity)
    await ensure_permission(entity, "write", user)
    data = clean_payload(schema, body, partial=False)

    if schema.get("slug_from") and not data.get("slug"):
        data["slug"] = slugify(data.get(schema["slug_from"], ""))
    now = datetime.now(timezone.utc).isoformat()
    data.update({
        "status": data.get("status") or "active",
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
        "created_by": str(user["_id"]),
    })
    if entity == "resources":
        data.setdefault("views", 0)
        data.setdefault("downloads", 0)
        data.setdefault("language", data.get("language") or "en")
    try:
        result = await db[schema["collection"]].insert_one(dict(data))
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A record with this slug or code already exists")
    data.pop("_id", None)
    data["id"] = str(result.inserted_id)
    return data


@router.put("/entities/{entity}/{item_id}")
async def update_entity(
    entity: str, item_id: str, body: dict = Body(...), user: dict = Depends(get_current_user)
):
    schema = schema_or_404(entity)
    await ensure_permission(entity, "write", user)
    data = clean_payload(schema, body, partial=True)
    if not data:
        raise HTTPException(status_code=400, detail="No editable fields provided")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        result = await db[schema["collection"]].update_one(
            {"_id": oid(item_id), "is_deleted": {"$ne": True}}, {"$set": data}
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A record with this slug or code already exists")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    doc = await db[schema["collection"]].find_one({"_id": oid(item_id)})
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.delete("/entities/{entity}/{item_id}")
async def delete_entity(entity: str, item_id: str, user: dict = Depends(get_current_user)):
    schema = schema_or_404(entity)
    await ensure_permission(entity, "delete", user)
    result = await db[schema["collection"]].update_one(
        {"_id": oid(item_id), "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True, "status": "archived",
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record archived"}


@router.get("/overview")
async def overview(user: dict = Depends(require_staff)):
    active = {"status": "active", "is_deleted": {"$ne": True}}
    counts = {}
    for name in ("states", "universities", "colleges", "courses", "subjects",
                 "categories", "resources"):
        counts[name] = await db[name].count_documents(active)
    counts["users"] = await db.users.count_documents({"is_deleted": {"$ne": True}})
    return {"counts": counts, "role": user.get("role")}


# ---------- User + role management (admin only) ----------
@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = Query(50, le=200),
    user: dict = Depends(require_permission("user:read")),
):
    filters = {"is_deleted": {"$ne": True}}
    cursor = db.users.find(filters).sort("created_at", -1).skip(skip).limit(limit)
    return {
        "items": [public_user(d) for d in await cursor.to_list(limit)],
        "total": await db.users.count_documents(filters),
    }


@router.post("/users", status_code=201)
async def create_user(body: dict = Body(...), actor: dict = Depends(require_permission("user:write"))):
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""
    role = body.get("role") or "student"
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if role not in ROLE_RANK:
        raise HTTPException(status_code=400, detail="Unknown role")
    if ROLE_RANK[role] > ROLE_RANK[actor.get("role", "student")]:
        raise HTTPException(status_code=403, detail="You cannot grant a role above your own")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    username = (body.get("username") or email.split("@")[0]).strip().lower()
    if await db.users.find_one({"username": username}):
        username = f"{username}-{str(ObjectId())[-4:]}"
    doc = {
        "name": (body.get("name") or "").strip() or email.split("@")[0],
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "status": "active",
        "is_deleted": False,
        "email_verified": False,
        "phone_verified": False,
        "created_at": now,
        "updated_at": now,
        "created_by": str(actor["_id"]),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return public_user(doc)


@router.put("/users/{user_id}")
async def update_user(
    user_id: str, body: dict = Body(...), actor: dict = Depends(require_permission("user:write"))
):
    target = await db.users.find_one({"_id": oid(user_id), "is_deleted": {"$ne": True}})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    if "name" in body:
        updates["name"] = (body.get("name") or "").strip()
    if "status" in body:
        if body["status"] not in ("active", "suspended"):
            raise HTTPException(status_code=400, detail="Unknown status")
        updates["status"] = body["status"]
    if "role" in body:
        role = body["role"]
        if role not in ROLE_RANK:
            raise HTTPException(status_code=400, detail="Unknown role")
        if ROLE_RANK[role] > ROLE_RANK[actor.get("role", "student")]:
            raise HTTPException(status_code=403, detail="You cannot grant a role above your own")
        if str(target["_id"]) == str(actor["_id"]) and role != actor.get("role"):
            raise HTTPException(status_code=400, detail="You cannot change your own role")
        updates["role"] = role
    if body.get("password"):
        if len(body["password"]) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        updates["password_hash"] = hash_password(body["password"])
    if not updates:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": target["_id"]}, {"$set": updates})
    return public_user(await db.users.find_one({"_id": target["_id"]}))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, actor: dict = Depends(require_permission("user:delete"))):
    if str(actor["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    result = await db.users.update_one(
        {"_id": oid(user_id), "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True, "status": "suspended",
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User removed"}
