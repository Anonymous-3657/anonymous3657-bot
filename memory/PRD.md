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

## Backlog
### P0 (Step 2)
- Authentication: registration, login, JWT/session, password hashing, email verification, role-based guards on APIs.
### P1
- Step 3 student dashboard + sidebar shell; Step 4 secure uploads, approval workflow, signed downloads.
### P2
- Step 5 admin panel; Step 6 coins/wallet; Step 7 premium/payments; Step 8 community/notifications; Step 9 AI tools; Step 10 production hardening.

## Env vars
Backend: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `APP_ENV`, `STORAGE_PROVIDER` (+ `JWT_SECRET` in Step 2 — see `.env.example`).
Frontend: `REACT_APP_BACKEND_URL`.

## Notes
No authentication, payments, wallets or coin transactions exist. Seed data is flagged demo in the API and badged in the UI.
