"""Pydantic document models for CG STUDENT PORTAL (MongoDB)."""
from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _to_str_id(v: Any) -> Any:
    if isinstance(v, ObjectId):
        return str(v)
    return v


PyObjectId = Annotated[str, BeforeValidator(_to_str_id)]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        doc = self.model_dump(by_alias=True, exclude_none=True)
        doc.pop("_id", None)
        return doc

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if not doc:
            return None
        return cls.model_validate(doc)


class Timestamped(BaseDocument):
    status: str = "active"
    is_deleted: bool = False
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


# ---------- Geography / Academic hierarchy ----------
class State(Timestamped):
    name: str
    code: str
    country_code: str = "IN"


class University(Timestamped):
    state_id: Optional[PyObjectId] = None
    name: str
    short_name: Optional[str] = None
    slug: str
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    description: Optional[str] = None
    official_website: Optional[str] = None
    official_result_url: Optional[str] = None
    official_notice_url: Optional[str] = None
    is_demo: bool = False


class College(Timestamped):
    university_id: Optional[PyObjectId] = None
    name: str
    slug: str
    college_code: Optional[int] = None
    college_name: Optional[str] = None
    college_type: Optional[str] = None  # G / NG / G-A
    college_type_label: Optional[str] = None
    district: Optional[str] = None
    is_active: bool = True
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    is_demo: bool = False


class Course(Timestamped):
    university_id: Optional[PyObjectId] = None
    name: str
    short_name: Optional[str] = None
    slug: str
    course_type: Optional[str] = None  # UG / PG / Diploma
    duration: Optional[str] = None
    is_demo: bool = False


class Subject(Timestamped):
    course_id: Optional[PyObjectId] = None
    name: str
    code: Optional[str] = None
    semester_or_year: Optional[str] = None
    description: Optional[str] = None
    is_demo: bool = False


class Category(Timestamped):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None


class Resource(Timestamped):
    university_id: Optional[PyObjectId] = None
    college_id: Optional[PyObjectId] = None
    course_id: Optional[PyObjectId] = None
    subject_id: Optional[PyObjectId] = None
    category_id: Optional[PyObjectId] = None
    title: str
    slug: str
    description: Optional[str] = None
    file_url: Optional[str] = None  # storage key, never a public provider URL
    preview_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    year: Optional[int] = None
    language: str = "en"
    is_premium: bool = False
    is_verified: bool = False
    views: int = 0
    downloads: int = 0
    uploaded_by: Optional[PyObjectId] = None
    approved_by: Optional[PyObjectId] = None
    approved_at: Optional[str] = None
    is_demo: bool = False


# ---------- Identity foundation (auth arrives in Step 2) ----------
class Role(BaseDocument):
    name: str
    description: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)


class Permission(BaseDocument):
    name: str
    description: Optional[str] = None


class RolePermission(BaseDocument):
    role_id: PyObjectId
    permission_id: PyObjectId


class User(Timestamped):
    name: str
    username: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str = "student"
    email_verified: bool = False
    phone_verified: bool = False
    password_hash: Optional[str] = None  # TODO(Step 2): populated by auth module
    last_login_at: Optional[str] = None
