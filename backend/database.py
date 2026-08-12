"""MongoDB connection + index bootstrap."""
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


def close_client():
    _client.close()


async def ensure_indexes():
    await db.states.create_index("code", unique=True)
    await db.states.create_index("status")

    await db.universities.create_index("slug", unique=True)
    await db.universities.create_index([("state_id", 1), ("status", 1)])
    await db.universities.create_index("created_at")
    await db.universities.create_index([("name", "text"), ("short_name", "text")])

    await db.colleges.create_index("slug", unique=True)
    await db.colleges.create_index([("university_id", 1), ("status", 1)])

    await db.courses.create_index("slug", unique=True)
    await db.courses.create_index([("university_id", 1), ("status", 1)])

    await db.subjects.create_index([("course_id", 1), ("semester_or_year", 1)])
    await db.subjects.create_index([("course_id", 1), ("code", 1)], unique=True, sparse=True)
    await db.subjects.create_index("status")

    await db.categories.create_index("slug", unique=True)

    await db.resources.create_index("slug", unique=True)
    for field in ("university_id", "college_id", "course_id", "subject_id",
                  "category_id", "year", "status", "created_at"):
        await db.resources.create_index(field)
    await db.resources.create_index([("title", "text"), ("description", "text")])

    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.roles.create_index("name", unique=True)
    await db.permissions.create_index("name", unique=True)
    await db.role_permissions.create_index(
        [("role_id", 1), ("permission_id", 1)], unique=True
    )
