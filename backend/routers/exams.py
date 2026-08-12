"""Exam countdown for the signed-in student, driven by admin-managed schedules."""
from datetime import date, datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from auth import get_current_user
from database import db

router = APIRouter(prefix="/me", tags=["exams"])


def parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
    except ValueError:
        return None


@router.get("/exam-countdown")
async def exam_countdown(user: dict = Depends(get_current_user)):
    course_id = user.get("course_id")
    semester = (user.get("semester_or_year") or "").strip()
    empty = {
        "state": "unscheduled",
        "message": "Exam date will be announced soon.",
        "semester": semester or None,
        "course": None,
    }
    if not course_id or not semester:
        return empty

    course = await db.courses.find_one({"_id": ObjectId(course_id)}) \
        if ObjectId.is_valid(course_id) else None
    course_name = (course or {}).get("short_name") or (course or {}).get("name")
    empty["course"] = course_name

    cursor = db.exam_schedules.find({
        "course_id": course_id,
        "semester": semester,
        "is_deleted": {"$ne": True},
        "status": {"$ne": "inactive"},
    }).sort("start_date", 1)
    schedules = await cursor.to_list(50)
    if not schedules:
        return empty

    today = datetime.now(timezone.utc).date()
    upcoming, ongoing, past = [], [], []
    for s in schedules:
        start, end = parse_date(s.get("start_date")), parse_date(s.get("end_date"))
        if not start:
            continue
        end = end or start
        if today < start:
            upcoming.append((start, end, s))
        elif start <= today <= end:
            ongoing.append((start, end, s))
        else:
            past.append((start, end, s))

    def payload(start, end, s, state, message, days_left=None):
        return {
            "state": state,
            "message": message,
            "days_left": days_left,
            "course": course_name,
            "semester": s.get("semester"),
            "exam_type": s.get("exam_type"),
            "session": s.get("session"),
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }

    if ongoing:
        start, end, s = ongoing[0]
        return payload(start, end, s, "ongoing", "Examination is ongoing", 0)
    if upcoming:
        start, end, s = upcoming[0]
        days = (start - today).days
        return payload(start, end, s, "upcoming",
                       f"{days} day{'s' if days != 1 else ''} left", days)
    start, end, s = past[-1]
    return payload(start, end, s, "completed", "Examination completed", 0)
