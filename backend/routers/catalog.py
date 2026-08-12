"""Read-only catalog APIs: states, universities, colleges, courses, subjects, categories."""
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query

from database import db
from models import Category, College, Course, State, Subject, University

router = APIRouter(tags=["catalog"])

ACTIVE = {"status": "active", "is_deleted": False}


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid identifier")


async def _list(collection, model, filters: dict, skip: int, limit: int, sort_field="name"):
    cursor = collection.find(filters).sort(sort_field, 1).skip(skip).limit(limit)
    items = [model.from_mongo(d).model_dump() for d in await cursor.to_list(limit)]
    total = await collection.count_documents(filters)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/states")
async def list_states(skip: int = 0, limit: int = Query(50, le=100)):
    return await _list(db.states, State, dict(ACTIVE), skip, limit)


@router.get("/universities")
async def list_universities(
    state_id: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(20, le=100),
):
    filters = dict(ACTIVE)
    if state_id:
        filters["state_id"] = str(oid(state_id))
    if q:
        filters["name"] = {"$regex": q.strip()[:80], "$options": "i"}
    return await _list(db.universities, University, filters, skip, limit)


@router.get("/universities/{slug}")
async def get_university(slug: str):
    doc = await db.universities.find_one({"slug": slug, **ACTIVE})
    if not doc:
        raise HTTPException(status_code=404, detail="University not found")
    uid = str(doc["_id"])
    courses = [Course.from_mongo(d).model_dump() for d in
               await db.courses.find({"university_id": uid, **ACTIVE}).sort("name", 1).to_list(100)]
    colleges = [College.from_mongo(d).model_dump() for d in
                await db.colleges.find({"university_id": uid, **ACTIVE}).sort("name", 1).to_list(100)]
    return {
        "university": University.from_mongo(doc).model_dump(),
        "courses": courses,
        "colleges": colleges,
        "resource_count": await db.resources.count_documents({"university_id": uid, **ACTIVE}),
    }


@router.get("/colleges")
async def list_colleges(
    university_id: Optional[str] = None, skip: int = 0, limit: int = Query(20, le=100)
):
    filters = dict(ACTIVE)
    if university_id:
        filters["university_id"] = str(oid(university_id))
    return await _list(db.colleges, College, filters, skip, limit)


@router.get("/courses")
async def list_courses(
    university_id: Optional[str] = None,
    course_type: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(24, le=100),
):
    filters = dict(ACTIVE)
    if university_id:
        filters["university_id"] = str(oid(university_id))
    if course_type:
        filters["course_type"] = course_type
    return await _list(db.courses, Course, filters, skip, limit)


@router.get("/courses/{slug}")
async def get_course(slug: str):
    doc = await db.courses.find_one({"slug": slug, **ACTIVE})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    subjects = [Subject.from_mongo(d).model_dump() for d in
                await db.subjects.find({"course_id": str(doc["_id"]), **ACTIVE})
                .sort([("semester_or_year", 1), ("name", 1)]).to_list(200)]
    return {"course": Course.from_mongo(doc).model_dump(), "subjects": subjects}


@router.get("/subjects")
async def list_subjects(
    course_id: Optional[str] = None,
    semester_or_year: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(24, le=100),
):
    filters = dict(ACTIVE)
    if course_id:
        filters["course_id"] = str(oid(course_id))
    if semester_or_year:
        filters["semester_or_year"] = semester_or_year
    if q:
        filters["name"] = {"$regex": q.strip()[:80], "$options": "i"}
    return await _list(db.subjects, Subject, filters, skip, limit)


@router.get("/categories")
async def list_categories(skip: int = 0, limit: int = Query(24, le=100)):
    return await _list(db.categories, Category, dict(ACTIVE), skip, limit)
