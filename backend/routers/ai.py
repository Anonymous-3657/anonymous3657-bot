"""AI Study Buddy: chat Q&A, note summaries and practice questions.

Chat + practice run on GPT-5.4; long-text summaries run on Gemini 3 Flash.
History lives in MongoDB, keyed to the signed-in student.
"""
import logging
import os
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user
from database import db
from routers.pdfs import pdf_bytes_for
from security import rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])

CHAT_MODEL = ("openai", "gpt-5.4")
LONG_TEXT_MODEL = ("gemini", "gemini-3-flash-preview")
HISTORY_TURNS = 12
MAX_INPUT_CHARS = 12000

TUTOR_PROMPT = (
    "You are CG Study Buddy, a friendly tutor for Indian university students, "
    "mostly from Chhattisgarh. Explain clearly and simply, in short paragraphs or "
    "bullet points. Use examples from the Indian context where helpful. If a question "
    "is outside academics, politely steer back to studies. Never invent exam papers, "
    "results or official university notices — say you are not sure instead."
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def llm_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="The AI assistant is not configured on this server yet.",
        )
    return key


def build_chat(session_id: str, system_message: str, model=CHAT_MODEL) -> LlmChat:
    provider, name = model
    return LlmChat(
        api_key=llm_key(),
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, name)


async def store(session_id: str, user_id: str, role: str, content: str, kind: str):
    await db.ai_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "kind": kind,
        "created_at": now_iso(),
    })


async def own_session(session_id: str, user_id: str) -> dict:
    session = await db.ai_sessions.find_one({"session_id": session_id})
    if not session or session.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return session


async def history_for(session_id: str, user_id: str) -> list[dict]:
    cursor = (
        db.ai_messages.find({"session_id": session_id, "user_id": user_id})
        .sort("created_at", -1)
        .limit(HISTORY_TURNS * 2)
    )
    docs = await cursor.to_list(HISTORY_TURNS * 2)
    return list(reversed(docs))


async def run_llm(chat: LlmChat, prompt: str) -> str:
    try:
        return await chat.send_message(UserMessage(text=prompt))
    except Exception as exc:  # noqa: BLE001
        logger.exception("LLM call failed")
        detail = "The AI assistant is busy right now. Please try again in a moment."
        if "budget" in str(exc).lower() or "quota" in str(exc).lower():
            detail = "The AI credit balance has run out. Top it up to keep using Study Buddy."
        raise HTTPException(status_code=502, detail=detail)


# ------------------------------------------------------------------ chat Q&A
class AskPayload(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    session_id: str | None = None
    subject: str | None = Field(default=None, max_length=120)


@router.post("/ask")
async def ask(payload: AskPayload, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await rate_limit(f"ai:{user_id}", limit=40, window_seconds=3600,
                     message="You have reached today's AI limit. Please try again later.")

    session_id = payload.session_id or uuid.uuid4().hex
    if payload.session_id:
        await own_session(session_id, user_id)
    else:
        await db.ai_sessions.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "title": payload.question[:70],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })

    system = TUTOR_PROMPT
    if payload.subject:
        system += f" The student is studying {payload.subject}."

    prior = await history_for(session_id, user_id)
    if prior:
        transcript = "\n".join(
            f"{'Student' if m['role'] == 'user' else 'You'}: {m['content'][:800]}" for m in prior
        )
        system += f"\n\nEarlier in this conversation:\n{transcript}"

    chat = build_chat(session_id, system)
    answer = await run_llm(chat, payload.question)

    await store(session_id, user_id, "user", payload.question, "ask")
    await store(session_id, user_id, "assistant", answer, "ask")
    await db.ai_sessions.update_one(
        {"session_id": session_id}, {"$set": {"updated_at": now_iso()}}
    )
    return {"session_id": session_id, "answer": answer}


# ---------------------------------------------------------------- summaries
class SummarisePayload(BaseModel):
    text: str = Field(min_length=200, max_length=MAX_INPUT_CHARS)
    title: str | None = Field(default=None, max_length=200)


@router.post("/summarise")
async def summarise(payload: SummarisePayload, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await rate_limit(f"ai:{user_id}", limit=40, window_seconds=3600,
                     message="You have reached today's AI limit. Please try again later.")

    session_id = uuid.uuid4().hex
    chat = build_chat(
        session_id,
        "You summarise study material for university students. Reply with: a two-line "
        "overview, then 'Key points' as 5-8 bullets, then 'Remember for the exam' as "
        "3 short bullets. Keep it exam-focused and never add facts that are not in the text.",
        LONG_TEXT_MODEL,
    )
    prompt = "Summarise this study material"
    if payload.title:
        prompt += f" titled '{payload.title}'"
    prompt += f":\n\n{payload.text}"

    summary = await run_llm(chat, prompt)
    await db.ai_sessions.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "title": payload.title or "Summary",
        "kind": "summary",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await store(session_id, user_id, "user", payload.text[:2000], "summarise")
    await store(session_id, user_id, "assistant", summary, "summarise")
    return {"session_id": session_id, "summary": summary}


# -------------------------------------------------------- practice questions
class PracticePayload(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    count: int = Field(default=5, ge=3, le=10)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")


@router.post("/practice")
async def practice(payload: PracticePayload, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await rate_limit(f"ai:{user_id}", limit=40, window_seconds=3600,
                     message="You have reached today's AI limit. Please try again later.")

    session_id = uuid.uuid4().hex
    chat = build_chat(
        session_id,
        "You write practice exam questions for Indian university students. Number each "
        "question, mark the marks it would carry, and after all questions add an "
        "'Answers' section with a short model answer for each. Match the requested "
        "difficulty and keep the style close to a real university paper.",
    )
    questions = await run_llm(
        chat,
        f"Create {payload.count} {payload.difficulty} practice questions on: {payload.topic}",
    )

    await db.ai_sessions.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "title": f"Practice: {payload.topic[:50]}",
        "kind": "practice",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await store(session_id, user_id, "user", payload.topic, "practice")
    await store(session_id, user_id, "assistant", questions, "practice")
    return {"session_id": session_id, "questions": questions}


# ----------------------------------------------------------- PDF summarisation
PDF_MODES = {
    "short": "Write a short summary in 4-6 sentences a student can read in a minute.",
    "detailed": "Write a detailed, section-by-section summary with clear headings.",
    "key_points": "List the most important points as 8-15 crisp bullets.",
    "exam_notes": "Write compact exam revision notes: headings, short bullets, formulas "
                  "and anything worth memorising.",
    "definitions": "List the key definitions and terms with a one or two line "
                   "explanation each.",
    "questions": "List the most likely exam questions from this material, grouped as "
                 "short-answer and long-answer, with the marks each might carry.",
    "unit_wise": "Summarise unit by unit (or chapter by chapter). If the material has no "
                 "unit structure, say so and summarise by topic instead.",
}


class PdfSummaryPayload(BaseModel):
    pdf_id: str
    mode: str = Field(default="short")


def extract_pdf_text(data: bytes) -> str:
    from io import BytesIO

    from pypdf import PdfReader

    try:
        reader = PdfReader(BytesIO(data))
        parts = [(page.extract_text() or "") for page in reader.pages[:60]]
    except Exception:  # noqa: BLE001
        logger.exception("PDF parsing failed")
        raise HTTPException(
            status_code=422,
            detail="We could not read this PDF. It may be damaged or password protected.",
        )
    return "\n".join(parts).strip()


@router.post("/pdf-summary")
async def pdf_summary(payload: PdfSummaryPayload, user: dict = Depends(get_current_user)):
    if payload.mode not in PDF_MODES:
        raise HTTPException(status_code=400, detail="Unknown summary type")
    user_id = str(user["_id"])
    await rate_limit(f"ai:{user_id}", limit=40, window_seconds=3600,
                     message="You have reached today's AI limit. Please try again later.")

    doc, data = await pdf_bytes_for(payload.pdf_id, user)
    text = extract_pdf_text(data)
    if len(text) < 200:
        raise HTTPException(
            status_code=422,
            detail="No readable text could be extracted from this PDF. It looks like a "
                   "scanned or image-only document, so a summary cannot be generated.",
        )
    text = text[:MAX_INPUT_CHARS]

    session_id = uuid.uuid4().hex
    chat = build_chat(
        session_id,
        "You summarise study material for Indian university students. Use ONLY the text "
        "provided — never add facts, questions or definitions that are not present in it. "
        "If the material does not cover something, say so plainly. "
        f"Task: {PDF_MODES[payload.mode]}",
        LONG_TEXT_MODEL,
    )
    summary = await run_llm(chat, f"Study material titled '{doc.get('title')}':\n\n{text}")

    await db.ai_sessions.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "title": f"{doc.get('title', 'PDF')[:50]} · {payload.mode.replace('_', ' ')}",
        "kind": "pdf_summary",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await store(session_id, user_id, "user",
                f"{payload.mode.replace('_', ' ')} of {doc.get('title')}", "pdf_summary")
    await store(session_id, user_id, "assistant", summary, "pdf_summary")
    return {
        "session_id": session_id,
        "summary": summary,
        "mode": payload.mode,
        "title": doc.get("title"),
        "extracted_characters": len(text),
    }


# ----------------------------------------------------------------- history
@router.get("/sessions")
async def list_sessions(limit: int = Query(20, le=50), user: dict = Depends(get_current_user)):
    cursor = (
        db.ai_sessions.find({"user_id": str(user["_id"])}, {"_id": 0})
        .sort("updated_at", -1)
        .limit(limit)
    )
    return {"items": await cursor.to_list(limit)}


@router.get("/sessions/{session_id}")
async def session_messages(session_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await own_session(session_id, user_id)
    cursor = (
        db.ai_messages.find({"session_id": session_id, "user_id": user_id}, {"_id": 0})
        .sort("created_at", 1)
        .limit(200)
    )
    return {"items": await cursor.to_list(200)}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    await own_session(session_id, user_id)
    await db.ai_messages.delete_many({"session_id": session_id, "user_id": user_id})
    await db.ai_sessions.delete_one({"session_id": session_id, "user_id": user_id})
    return {"message": "Conversation deleted"}
