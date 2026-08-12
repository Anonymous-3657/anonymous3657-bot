# CG STUDENT PORTAL — Product Requirements & Build Log

**Domain:** cgstudentsportal.in (production) · Preview: Emergent preview URL
**Tagline:** Study • Earn • Grow
**Stack:** React (CRA + craco) + Tailwind + Shadcn UI + Framer Motion · FastAPI · MongoDB (Motor)
**User language:** Hinglish / Hindi + English — always reply in the user's language.

## Original problem statement
A production-ready, scalable EdTech student platform for the Hemchand Yadav Vishwavidyalaya
(Durg) affiliated-college region of Chhattisgarh. Students discover and share study material
(notes, question papers), get AI study help, save resources, and track exams. Staff moderate
everything through an admin panel. Built in phases (Step 1 → Step 8).

## Personas
- **Student** — browses/searches resources, uploads PDFs, uses AI Study Buddy, bookmarks, sees exam countdown.
- **Moderator / Admin / Super admin** — manages academic master data, reviews and approves student PDFs, manages colleges and exam schedules, manages users and roles.

## Implemented (chronological)

### Step 1 — Foundation
Public catalog (states, universities, colleges, courses, subjects, categories), resource
browse/search/detail, SEO, responsive custom UI, K8s liveness probe at `GET /health`
(HTTP/1.0, no `/api` prefix — must never be removed).

### Step 2 — Auth, RBAC and Admin panel
JWT httpOnly-cookie sessions, register/login/logout/refresh, email verification and password
reset via the Emergent-managed Resend integration, OTP, rate limiting and login lockout,
audit events, strict role permissions (student / contributor / moderator / admin / super_admin),
admin CRUD for all academic entities, user & role management.

### Custom features
- **Bookmark shelf** (`/bookmarks`) — per-student saved resources.
- **AI Study Buddy** (`/study-buddy`) — ask doubts, summarise notes, generate practice
  questions (GPT-5.4 + Gemini 3 Flash via the Emergent universal LLM key).

### Step 4 — Study material management + college master data (June 2026)
- **158-college master list** seeded from the user's official JSON
  (`backend/data/colleges_158.json`, `backend/seed_colleges.py`, idempotent on
  `college_code`, also runs on backend startup). District auto-derived from official college
  names and code blocks into the 7 required district groups. `GET /api/colleges/master`
  supports search by name/code, district and type filters.
- **Registration & profile now require a college** chosen from that master list via a
  searchable, district-grouped dropdown (`SearchableSelect` / `CollegeSelect`). Backend
  validates `college_code` and stores `college_id`, `college_code`, `college_name`,
  `college_type`, `district`. Free text is rejected. Existing students see a
  "Please select your college to complete your profile." banner on the dashboard.
- **Private PDF uploads** — Emergent object storage (private; no public URL ever leaves the
  server). Validation: PDF extension + MIME + `%PDF` magic bytes + 25 MB cap + per-user
  SHA-256 duplicate detection + 20 uploads/hour. Upload progress UI.
- **Admin approval workflow** (`/admin/pdfs`) — pending / approved / rejected tabs with
  uploader name, email, college, subject, semester, date and size; approve, reject with a
  mandatory reason (echoed to the student), delete. A student can never approve their own
  upload; unapproved files are invisible to everyone but the owner and staff.
- **Study Buddy PDF summarisation** — real `pypdf` text extraction with 7 modes (short,
  detailed, important points, exam notes, key definitions, important questions, unit-wise).
  Image-only/scanned PDFs return a clear 422 instead of hallucinated content. No OCR (user choice).
- **Exam schedules & countdown** — admin-managed `exam_schedules` entity; student dashboard
  countdown resolves by course + semester with states unscheduled / upcoming / ongoing / completed.
- **Dashboard rebuild** — college, course, semester, exam countdown, quick actions, recently
  approved PDFs, latest resources, verification and complete-profile banners.
- **Bookmark shelf extended** to approved PDFs (`/api/me/bookmarks` accepts `pdf_id`).
- **Admin College Management** (`/admin/colleges`) — search by name/code, filter by district
  and Government / Non-Government / Autonomous, activate/deactivate (never delete).

## Testing status (June 2026)
- Backend: `backend/tests/test_step4_backend.py` — 36/36 assertions pass (college master,
  registration validation, upload validation, duplicate/self-approval/authorization blocks,
  AI summary + no-text error, admin review, bookmarks, countdown, college filters).
- Regressions: 122/122 across `test_step1/auth/admin/bookmarks_ai/rbac/lockout` pass.
- Frontend: iterations 9–11 (`/app/test_reports/iteration_11.json`) — all Step 4 browser flows
  pass, including 390 px mobile with no horizontal overflow.
- Deployment agent health check: **pass**, no blockers.

## Backlog
**P0** — none open.
**P1**
- Step 6: coins & rewards for approved uploads.
- Step 7: premium plans & payments.
- Step 8: community Q&A + notifications (email/in-app on approve/reject).
- Notify the student by email when their PDF is approved or rejected.
**P2**
- OCR for scanned PDFs (user deferred).
- Subject/semester taxonomy for uploads instead of free-text fields.
- Bulk admin actions in the PDF queue; download counters and popularity ranking for PDFs.

## Notes / invariants
- `GET /health` and `GET /api/health` must stay for K8s probes.
- Storage is private: PDFs are only served through `/api/pdfs/{id}/file` after an
  authorization check. No provider URL is ever exposed to the client.
- Admin credentials and all endpoint notes live in `/app/memory/test_credentials.md`.
- Seeded demo catalog data is flagged `is_demo` in the API and badged in the UI.
