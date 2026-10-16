# ROADMAP.md — PR-level execution plan

Every row is **one PR = one day** (≤ 12 files, ≤ ~300 lines, 2–3 commits, one teach note in `learn/<ID>/teach.md`). `FE` = frontend, `BE` = backend, `WIRE` = connect FE to real BE. Order inside each slice: FE PRs → BE PRs → WIRE PRs → slice gate (`APPROVED S<n>`). Each PR also needs `UNDERSTOOD <ID>` before the next one starts. If a row proves too big, split it and log it in `PROGRESS.md`. Approximately **140 PRs** in total.

---

## S0 — Foundation (F0 + M0)

### S0-00 Docs and ignore rules (docs-only)
Files: `CLAUDE.md`, `ROADMAP.md`, `PROGRESS.md`, `backend.md`, `frontend.md`, `.gitignore` (contains `/learn/`, `.env*`, `node_modules`, `.next`, `__pycache__`, `.venv`). Teach: git basics used here, what `.gitignore` does, why `learn/` is ignored, how to verify with `git check-ignore`.

### S0-01 Repo hygiene + Next.js scaffold + minimal landing page (FE) — **Day 1**
Files (≈ 11): `README.md`, `.github/pull_request_template.md`, `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore` additions, `apps/web/.env.example`. Result: `pnpm dev` shows a simple "BookLoop" page at `/`.
Teach must cover: monorepo layout and why `apps/web`; what each config file does; how **App Router** maps `app/page.tsx` → `/`; what `layout.tsx` is (root layout wraps every page, must have `<html>` and `<body>`); Server vs Client Components (default server); what `next dev` does vs `next build` + `next start`; the exact trace of `GET /` through Next.js; how `globals.css` is imported and how Tailwind's pipeline (PostCSS) turns utility classes into CSS; why there is no `src/` folder.

### S0-02 Design tokens, fonts, theme (FE)
Files: `styles/tokens.css`, `styles/glass.css`, `app/layout.tsx` (fonts via `next/font`), `app/globals.css`, `components/theme/theme-script.tsx`, `lib/utils.ts`, a token demo section on the landing page. Teach: CSS variables, how `next/font` self-hosts fonts, preventing theme flash, dark/light via `[data-theme]`.

### S0-03 Aurora Stage backdrop (FE)
Files: `components/stage/aurora-stage.tsx`, CSS, layout wiring, reduced-motion handling, pause-on-hidden-tab. Teach: fixed layers, transform-only animation, why blur is expensive, `prefers-reduced-motion`.

### S0-04 Landing: glass nav + hero (FE)
Files: `components/layout/site-header.tsx`, `components/domain/hero.tsx`, `app/(public)/page.tsx` move, layout updates. Teach: **route groups** `(public)`, how parentheses affect URLs, composition of layouts.

### S0-05 Landing: shelves, how-it-works, footer (FE)
Files: static data file, `book-shelf.tsx`, `how-it-works.tsx`, `site-footer.tsx`, page. Teach: server components rendering static data, `next/image`, aspect ratios and CLS.

### S0-06 Route groups + placeholder pages + 404/error/loading (FE)
Files: placeholder `page.tsx` for `(auth)`, `(buyer)`, `(seller)/sell`, `(warehouse)/warehouse`, `(courier)/courier`, `(admin)/admin` (use only as many files as fit; split across two PRs if needed), `not-found.tsx`, `error.tsx`, `loading.tsx`. Teach: special files, error boundaries, nested layouts, URL ↔ folder map.

### S0-07 Responsive navigation (FE)
Files: mobile bottom tab bar, drawer, breakpoint hook, header updates. Teach: mobile-first CSS, breakpoints table, safe-area insets, Client Components and why nav needs one (`"use client"`).

### S0-08 Glass primitives I: Button, GlassCard, Badge (FE)
### S0-09 Glass primitives II: Input, Textarea, Select, Checkbox, Switch (FE)
### S0-10 Glass primitives III: Modal, Drawer, Toast, Tooltip (FE)
Teach for 08–10: Radix primitives, how shadcn/ui wraps them, `cva` variants, focus rings, accessibility roles.

### S0-11 Storybook + stories for primitives (FE)
### S0-12 Lint, format, typecheck, Vitest + first tests (FE tooling)
### S0-13 Playwright at 7 viewports + axe scan (FE tooling)
### S0-14 MSW setup + typed fetch wrapper (FE)
Teach: how MSW intercepts requests in browser/tests; why contract-first.
### S0-15 Dev Test Console shell (FE, mock data)

### S0-16 FastAPI skeleton + `/healthz` (BE)
Teach: ASGI, uvicorn, app factory, what a route/router is, request lifecycle, `uv` and `pyproject.toml`.
### S0-17 Settings, structured logging, request ID (BE)
### S0-18 Error model (problem+json) and exception handlers (BE)
### S0-19 Async DB engine, Supabase connection (pooler vs direct), `/readyz` (BE)
### S0-20 Alembic baseline + base model mixins (BE)
### S0-21 `Money` type + `Clock` + hypothesis tests (BE)
### S0-22 Redis + ARQ worker skeleton (BE)

### S0-23 OpenAPI export + generated TS client (WIRE)
### S0-24 Landing health badge + Test Console connected to real API (WIRE)
### S0-25 Makefile + docker-compose, one-command `make dev` + `make check` (infra)
### S0-26 GitHub Actions CI (lint, types, tests, migration check, a11y) (infra)
**→ S0 GATE.**

---

## S1 — Auth, roles, profiles (F1 + M1)
- S1-01 FE Login + Register screens (mock)
- S1-02 FE Password reset/verify screens + shared form pattern (react-hook-form + zod)
- S1-03 FE Account shell: profile + addresses screens (mock)
- S1-04 FE Become-a-seller + verification + suspended-account screens (mock)
- S1-05 BE users/profiles/roles/addresses tables + migration + RLS deny-by-default
- S1-06 BE Supabase JWT verification + `current_user` dependency
- S1-07 BE `GET/PATCH /me` + tests
- S1-08 BE Addresses CRUD (owner-scoped, 404 for others)
- S1-09 BE Become seller + `seller_verifications` (Stripe Connect onboarding behind an interface, fake adapter)
- S1-10 BE Admin suspend/unsuspend + `audit_log` + per-request suspension check
- S1-11 BE Route-auth enumeration test + JWT negative tests
- S1-12 WIRE `@supabase/ssr` cookies, real login/register/logout
- S1-13 WIRE Middleware route guards + role-aware nav
- S1-14 WIRE `/me`, addresses, seller verification, suspended screen
**→ S1 GATE.**

## S2 — Listings (F2 + M2)
- S2-01 FE Wizard shell + stepper + draft state (mock)
- S2-02 FE ISBN step + condition/notes step
- S2-03 FE Photo upload step (dropzone, previews, validation messages)
- S2-04 FE Fulfillment comparison step + price + review
- S2-05 FE My Listings + status chips + locked-field states
- S2-06 BE `books` + `listings` + photos + status history tables
- S2-07 BE ISBN lookup provider (SSRF-safe) + endpoint
- S2-08 BE Create/patch listing + immutability rules (service + DB trigger)
- S2-09 BE Publish/deactivate + status transitions
- S2-10 BE Signed photo upload + validation + EXIF strip
- S2-11 WIRE ISBN + create draft + autosave
- S2-12 WIRE Photos + publish
- S2-13 WIRE My Listings + deactivate
**→ S2 GATE.**

## S3 — Search and listing detail (F3 + M3)
- S3-01 FE BookCard + ConditionBadge + FulfillmentBadge
- S3-02 FE Search page layout, grid, skeletons (mock)
- S3-03 FE Filters (desktop rail, mobile sheet)
- S3-04 FE Listing detail (gallery, purchase card, sticky mobile bar)
- S3-05 BE FTS + trigram indexes + seed script (≥ 500 listings)
- S3-06 BE Search endpoint + filters + cursor pagination
- S3-07 BE Detail endpoint + privacy rules + availability freshness
- S3-08 BE Performance test
- S3-09 WIRE Search + filters + URL state
- S3-10 WIRE Detail + SEO metadata + JSON-LD
**→ S3 GATE.**

## S4 — Fees, ledger, tax, quote (F4 + M4 + M5)
**S4a (backend-only, gate via CLI/psql):**
- S4-01 BE `region_config` + `fee_schedules`
- S4-02 BE `FeeCalculator` + hypothesis tests
- S4-03 BE Ledger tables + immutability triggers
- S4-04 BE `LedgerService` + balanced-journal trigger + demo CLI
**→ S4a GATE.** Then **S4b:**
- S4-05 FE Address picker + `FeeBreakdown` + `RegionNotice` (mock)
- S4-06 BE `TaxProvider` interface + fake + Stripe Tax adapter
- S4-07 BE `POST /checkout/quote`
- S4-08 WIRE Quote in UI
**→ S4b GATE.** (Ask the user to settle merchant-of-record vs facilitator before S4-06.)

## S5 — Orders, reservation, payment (F5 + M6 + M7)
**S5a:**
- S5-01 FE Checkout shell + reservation countdown (mock)
- S5-02 BE Orders tables + status history + partial unique index
- S5-03 BE Reservation service (`FOR UPDATE`) + `POST /orders`
- S5-04 BE Race test + reservation-expiry worker
- S5-05 WIRE Create order + countdown
**→ S5a GATE.** **S5b:**
- S5-06 FE Payment Element + success/failure/expired states (mock)
- S5-07 BE `PaymentGateway` + pay endpoint
- S5-08 BE Webhooks (signature, replay, idempotency)
- S5-09 BE Capture → ledger journal → `paid_held`
- S5-10 BE Refunds (full/partial) with reversing journals
- S5-11 WIRE End-to-end payment + confirmation page
**→ S5b GATE.**

## S6 — Warehouse flow (F6 + M8)
- S6-01 FE Seller inbound label + tracking UI (mock)
- S6-02 FE Warehouse console shell + inbound queue
- S6-03 FE Inspection form, locate book, pick/pack, ship
- S6-04 BE Fulfillment tables + Strategy interface + registry + import-linter contract
- S6-05 BE Inbound shipment + label (fake shipping provider)
- S6-06 BE Inspection outcomes + "only pass makes it purchasable"
- S6-07 BE Storage location + "where is book X"
- S6-08 BE Pick/pack task on purchase + ship with tracking
- S6-09 WIRE Seller side
- S6-10 WIRE Warehouse console
**→ S6 GATE.**

## S7 — On-demand pickup (F7 + M9)
- S7-01 FE Courier PWA shell + task list
- S7-02 FE Pickup confirm (match / no match) + delivery complete
- S7-03 FE Dispatcher board
- S7-04 FE Buyer/seller tracking UI
- S7-05 BE On-demand tables + hubs + courier profiles
- S7-06 BE Pickup task creation + auto/manual assignment + queued fallback
- S7-07 BE Courier endpoints + `no_match` → dispute hook
- S7-08 BE Direct vs hub routing at dispatch time
- S7-09 BE Tracking endpoint + address-privacy tests
- S7-10 WIRE Courier app
- S7-11 WIRE Dispatcher + tracking
**→ S7 GATE.**

## S8 — Disputes, delivery, EU withdrawal (F8 + M10)
- S8-01 FE Orders list/detail + shared `OrderTimeline`
- S8-02 FE Confirm receipt + open dispute + thread
- S8-03 FE EU withdrawal + admin dispute resolution UI
- S8-04 BE Disputes tables + open endpoint + window rule
- S8-05 BE Payout block + resolution outcomes drive ledger
- S8-06 BE Confirm receipt endpoint
- S8-07 BE EU withdrawal workflow
- S8-08 WIRE All screens to real API
**→ S8 GATE.**

## S9 — Payouts and seller finance (F9 + M11)
- S9-01 FE Payout ledger + tax-info forms (mock)
- S9-02 BE Payouts + release worker (confirm or window, whichever first)
- S9-03 BE Seller ledger endpoints
- S9-04 BE `tax_reporting_records` + admin CSV export
- S9-05 WIRE Seller finance screens
**→ S9 GATE.**

## S10 — Ratings, notifications, admin (F10 + M12)
- S10-01 FE Rating UI + notification center (mock)
- S10-02 FE Admin tables (orders/listings/users)
- S10-03 BE Ratings rules + aggregates
- S10-04 BE Notifications + domain events + email adapter
- S10-05 BE Admin list endpoints + cancel + suspension cascade
- S10-06 WIRE All of the above
**→ S10 GATE.**

## S11 — Privacy and compliance (F11 + M13 part)
- S11-01 FE Data export/erasure screens + legal pages
- S11-02 BE Data export (`data_requests`)
- S11-03 BE Erasure/anonymization + retention document
- S11-04 BE Audit-log coverage + rate limiting everywhere
- S11-05 WIRE Privacy flows
**→ S11 GATE.**

## S12 — Polish (F12)
- S12-01 Motion presets
- S12-02 Empty/error/skeleton parity
- S12-03 i18n scaffolding
- S12-04 Offline + maintenance pages
**→ S12 GATE.**

## S13 — Hardening and release (F13 + M13 rest)
- S13-01 Full a11y audit + fixes
- S13-02 Visual-regression baselines
- S13-03 Performance budgets + bundle analysis
- S13-04 Security headers + CSP + secrets/rotation docs
- S13-05 Security scans + ASVS L2 checklist
- S13-06 Traceability document (every FR/NFR → test)
- S13-07 Load tests + chaos tests (provider/Redis down)
- S13-08 Runbook + deploy config + backup/restore drill
**→ FINAL GATE.**
