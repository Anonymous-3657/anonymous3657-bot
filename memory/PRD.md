# CG STUDENT PORTAL — PRD

## Original Problem Statement
Build Step 1 of **CG STUDENT PORTAL** (tagline: *Study • Earn • Grow*) — a production-ready, scalable, multi-university EdTech student platform. Serves Hemchand Yadav Vishwavidyalaya (Durg University) initially, but nothing about that university may be hardcoded into the architecture. Step 1 delivers branding, design tokens, reusable components, database architecture, security/storage/SEO foundations, seed data, the public homepage, and browse pages. Auth, uploads, admin, coins, payments, community and AI are explicitly later steps.

## User Choices (verbatim)
- Logo: text-based brand mark for now (no logo file uploaded)
- Database: MongoDB with proper collections + indexes + relations
- Scope: homepage + design system + DB schema/seed + read-only APIs **and** browse pages
- Seed university: Hemchand Yadav Vishwavidyalaya (marked demo)
- Auth / payments / coins: not in Step 1

## Architecture
- **Frontend**: React 19 + CRA/craco, Tailwind (brand tokens), framer-motion, lucide-react, shadcn/ui, react-router v7 with lazy-loaded routes.
- **Backend**: FastAPI, all routes under `/api`, modular routers (`meta`, `catalog`, `resources`), Motor/MongoDB, security headers middleware, generic error handler that never leaks internals.
- **Hierarchy**: Country → State → University → College → Course → Semester/Year → Subject → Category → Resource. Adding a university needs records only, no code changes.

## Core Requirements (static)
Multi-university data model, dark-first design tokens, reusable component system, mobile-first responsive UX, accessibility, SEO metadata, storage abstraction, no fake auth/payments/coins/wallets.

## Implemented (2026-06)
### Database collections + indexes
`states`, `universities`, `colleges`, `courses`, `subjects`, `categories`, `resources`, `users`, `roles`, `permissions`, `role_permissions`.
Unique slug/code indexes, compound indexes (university_id+status, course_id+semester), text indexes on names/titles for future full-text search, indexes on university_id/college_id/course_id/subject_id/category_id/year/status/created_at. Timestamps + `status` + `is_deleted` soft delete on all domain docs.

### API routes (all `/api`)
`GET /`, `/health`, `/stats`, `/search`, `/sitemap-entries`, `/states`, `/universities`, `/universities/{slug}`, `/colleges`, `/courses`, `/courses/{slug}`, `/subjects`, `/categories`, `/resources`, `/resources/{slug}`. Filters, sorting and pagination on listings. `file_url` is never returned.

### Frontend routes
`/`, `/universities`, `/universities/:slug`, `/courses`, `/courses/:slug`, `/resources`, `/categories`, `/legal/:page`, `*` (not found).

### Components
Logo (centralized brand), AppShell, Navbar, Footer, BottomNav, Breadcrumbs, PageHeader, SearchInput, SectionHeading, Reveal, Counter, DemoBadge, Skeletons, StateViews (empty/error/not-found/unauthorized/offline/server-error), ResourceCard, UniversityCard, CourseCard, StatCard, CategoryCard.

### Foundations
- Design tokens in `index.css` + `tailwind.config.js` + `src/config/tokens.js`; light-mode variables prepared.
- `prefers-reduced-motion` respected globally and inside animation components.
- Storage abstraction `backend/storage.py` (provider chosen via `STORAGE_PROVIDER`).
- SEO: `useSeo` hook (title, description, canonical, OG, Twitter), semantic HTML, breadcrumbs, robots.txt, sitemap-entries endpoint.
- Seed script `backend/seed.py` — idempotent, all records `is_demo=True`.
- Regression suite `backend/tests/test_step1_backend.py` (25 tests, all passing).

## Implemented — Step 2a: Admin panel + auth (2026-06)
### Backend
- `auth.py`: bcrypt hashing, JWT access (60 min) + refresh (7 days) as httpOnly/secure cookies, `get_current_user` re-reads the live user document (revoked roles take effect immediately), `require_permission` deny-by-default gate, `ROLE_PERMISSIONS` + `ROLE_RANK`, brute-force lockout keyed on the account (`email:<address>`; 5 failures → 15 min), idempotent `seed_admin()` from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `routers/auth_routes.py`: `POST /api/auth/login`, `/logout`, `/refresh`, `GET /api/auth/me`. Cookie-only session — no token in the JSON body. No public self-registration.
- `routers/admin.py`: per-entity writable field whitelists (no mass assignment) for states, universities, colleges, courses, subjects, categories, resources; `GET/POST/PUT/DELETE /api/admin/entities/{entity}` (soft delete), `GET /api/admin/overview`, and user CRUD at `/api/admin/users` with a role-rank guard (nobody grants a role above their own, nobody edits their own role or deletes their own account).
- CORS switched to credential-safe origin reflection; `login_attempts` index added.

### Frontend
- `AuthContext` (null = checking / false = signed out / object = signed in), `RequireStaff` route guard (admin + moderator), `AdminLayout` sidebar shell, generic `EntityManager` (table + create/edit modal + archive) driven by `constants/adminEntities.js`, `AdminLogin`, `AdminOverview`, `AdminEntityPage`, `AdminUsers`.
- Routes: `/admin/login`, `/admin`, `/admin/:entity`, `/admin/users`.

### Roles
admin = full catalog + resources + users · moderator = catalog read, resource write/approve · contributor = resource write · student = read only.

### Verified
52 backend tests passing (25 Step 1 + 21 admin + 6 lockout regression) plus admin UI flows. One bug found and fixed: lockout counter was fragmenting across rotating ingress proxy IPs.

## Implemented — Step 2: Student authentication (2026-06)
### Provider decision
No Supabase in this project. The existing bcrypt + JWT httpOnly-cookie system from Step 2a is the configured provider and was **extended**, not duplicated. Emails go through the Emergent-managed Resend integration. Per user choice there is **no Google OAuth** and **no SMS/phone OTP** yet (email OTP only).

### Routes (frontend)
Public: `/`, `/universities`, `/universities/:slug`, `/courses`, `/courses/:slug`, `/resources`, `/categories`, `/legal/:page`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
Authenticated: `/dashboard`, `/profile`. Staff: `/admin/login`, `/admin`, `/admin/:entity`, `/admin/users`.

### API
`POST /api/auth/register` (role + status are server-assigned), `GET /api/auth/username-available`, `POST /api/auth/login|logout|refresh`, `GET /api/auth/me`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/change-email`, `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/forgot-password` (enumeration-safe), `POST /api/auth/reset-password`, `POST /api/auth/change-password`, `PUT /api/auth/profile` (field whitelist), `GET /api/auth/audit-events`.

### Database
New collections: `auth_tokens` (sha256-hashed, single-use), `otp_codes` (hashed, 10 min, 5 attempts), `rate_limits`, `audit_events` — all indexed. `users` extended with university_id, college_id, course_id, semester_or_year, avatar_url, bio, accepted_terms_at, accepted_privacy_at.

### Roles & statuses
10 roles (student → super_admin) with a permission map and rank ordering; `STAFF_ROLES` gates the whole `/api/admin` router. Statuses: active, pending_verification, suspended, banned, deactivated — only the first two may hold a session.

### Security
bcrypt hashing, httpOnly + Secure cookies (samesite from APP_ENV), DB-resolved principal on every request, server-side password rules, account lockout (5/15 min), rate limits on register/forgot/resend/OTP request/OTP verify, no account enumeration, single-use hashed tokens, mass-assignment and role-escalation guards, audit logging that never records passwords, OTPs or tokens.

### Verified
107/107 backend tests (38 auth + 46 step1/admin + 6 lockout + 17 RBAC) plus desktop and 390px mobile browser flows. One bug found and fixed: students could read `/api/admin/overview` because it was gated on a permission students legitimately hold.

## Backlog
### P0
- Google OAuth and phone/SMS OTP if the user later wants them.
- Explicit `CORS_ORIGINS` allowlist for production.
### P1
- Step 3 dashboard depth: bookmarks, follows, my-downloads, notifications.
- Step 4 secure uploads, approval queue, signed downloads.
- `token_version` rotation so sensitive changes invalidate outstanding JWTs.
### P2
- Step 5 admin panel; Step 6 coins/wallet; Step 7 premium/payments; Step 8 community/notifications; Step 9 AI tools; Step 10 production hardening.

## Env vars
Backend: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `APP_ENV`, `STORAGE_PROVIDER` (+ `JWT_SECRET` in Step 2 — see `.env.example`).
Frontend: `REACT_APP_BACKEND_URL`.

## Notes
No authentication, payments, wallets or coin transactions exist. Seed data is flagged demo in the API and badged in the UI.
