"""Seed the 158 affiliated colleges master list (idempotent, keyed on college_code).

District is derived from the official college name, falling back to the college
code block (1xx BALOD, 2xx BEMETARA, 3xx DURG, 4xx KABIRDHAM, 5xx RAJNANDGAON).
"""
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from database import db, ensure_indexes

DATA_FILE = Path(__file__).parent / "data" / "colleges_158.json"

DISTRICTS = [
    "MOHLA-MANPUR-AMBAGARH CHOWKI",
    "KHAIRAGARH-CHHUIKHADAN-GANDAI",
    "BALOD",
    "BEMETARA",
    "KABIRDHAM",
    "RAJNANDGAON",
    "DURG",
]
# Spelling variants seen in the official list.
ALIASES = {
    "MOHLA-MANPUR-AMBAGARHCHOWKI": "MOHLA-MANPUR-AMBAGARH CHOWKI",
    "MOHLA MANPUR AMBAGARH CHOWKI": "MOHLA-MANPUR-AMBAGARH CHOWKI",
    "KHAIRAGARH-CHHUHIKHADAN-GANDAI": "KHAIRAGARH-CHHUIKHADAN-GANDAI",
    "KHAIRAGARH": "KHAIRAGARH-CHHUIKHADAN-GANDAI",
    "KAWARDHA": "KABIRDHAM",
    "BHILAI": "DURG",
}
CODE_BLOCK = {1: "BALOD", 2: "BEMETARA", 3: "DURG", 4: "KABIRDHAM", 5: "RAJNANDGAON"}

TYPE_LABELS = {"G": "Government", "NG": "Non-Government", "G-A": "Government Autonomous"}


def derive_district(name: str, code: int) -> str:
    upper = name.upper()
    for alias, district in ALIASES.items():
        if alias in upper:
            return district
    for district in DISTRICTS:
        if district in upper:
            return district
    return CODE_BLOCK.get(code // 100, "DURG")


def slugify(value: str, code: int) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return f"{s[:70].strip('-')}-{code}"


async def run() -> dict:
    await ensure_indexes()
    colleges = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    university = await db.universities.find_one({"slug": "hemchand-yadav-vishwavidyalaya"})
    university_id = str(university["_id"]) if university else None
    now = datetime.now(timezone.utc).isoformat()

    created = updated = 0
    for row in colleges:
        code = int(row["collegeCode"])
        name = " ".join(str(row["name"]).split())
        college_type = row["type"].strip().upper()
        doc = {
            "college_code": code,
            "college_name": name,
            "name": name,
            "college_type": college_type,
            "college_type_label": TYPE_LABELS.get(college_type, college_type),
            "district": derive_district(name, code),
            "university_id": university_id,
            "slug": slugify(name, code),
            "is_active": True,
            "is_demo": False,
            "is_deleted": False,
            "status": "active",
            "updated_at": now,
        }
        existing = await db.colleges.find_one({"college_code": code})
        if existing:
            # Never clobber an admin's activate/deactivate decision.
            doc["is_active"] = existing.get("is_active", True)
            doc["status"] = existing.get("status", "active")
            await db.colleges.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
        else:
            doc["created_at"] = now
            await db.colleges.insert_one(doc)
            created += 1

    total = await db.colleges.count_documents({"college_code": {"$exists": True}})
    return {"created": created, "updated": updated, "total_with_code": total}


if __name__ == "__main__":
    print(asyncio.run(run()))
