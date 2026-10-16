# ROADMAP.md — PR-level execution plan (v2: feature-level PRs)

**Unit of work:** one PR = one complete feature or component family, **including its own tests, stories and docs**, opened once per working day (2–3 commits). Limits are in `CLAUDE.md §3` (≤ 20 changed files, ≤ ~500 hand-written non-test lines, reviewable in about 30 minutes, leaves the app working and `make check` green). Each PR also gets `learn/<ID>/teach.md` and needs `UNDERSTOOD <ID>` before the next starts.

Order inside every slice: **FE PRs → BE PRs → WIRE PRs → slice gate** (`APPROVED S<n>`). `FE` = frontend against MSW mocks, `BE` = backend to the same contract, `WIRE` = connect FE to the real API and add Playwright e2e at ≥ 3 viewports.

If a PR cannot fit the limits, split it along a natural seam (component families, endpoint groups) and log the split in `PROGRESS.md`. Never split into tiny fragments, and never batch several days into one PR.

Approximately **82 PRs** in total (down from 140). S0-00 and S0-01 are already done and keep their original scope.

---

## S0 — Foundation (F0 + M0)

- **S0-00 ✅ Docs and ignore rules** (docs only).
- **S0-01 ✅ Repo hygiene + Next.js scaffold + minimal landing page** (FE). `README`, PR template, `apps/web` scaffold, root layout and page.
- **S0-02 Design foundation** (FE): tokens, glass CSS recipe, fonts via `next/font`, dark/light theme with no flash, Aurora Stage backdrop with reduced-motion handling. Teach: CSS variables, font loading, why blur is expensive, `prefers-reduced-motion`.
- **S0-03 Complete landing page** (FE): glass header, hero, shelves, how-it-works, footer, route group `(public)`. Teach: route groups, layout composition, server components rendering static data, `next/image` and layout shift.
- **S0-04 Frontend tooling** (FE tooling): ESLint, Prettier, `tsc`, Vitest + Testing Library, Playwright at 7 viewports, axe scan, first tests. Teach: what each tool catches and how to run it.
- **S0-05 Route structure + responsive navigation** (FE): placeholder pages for every role group, `not-found.tsx`, `error.tsx`, `loading.tsx`, mobile bottom tab bar, drawer, breakpoint handling. Teach: special files, error boundaries, nested layouts, URL ↔ folder map, `"use client"`.
- **S0-06 Glass primitives** (FE): Button, GlassCard, Badge, Input, Textarea, Select, Checkbox, Switch with tests. Teach: Radix primitives, shadcn/ui wrapping, `cva` variants, focus rings, accessibility roles.
- **S0-07 Overlays + Storybook** (FE): Modal, Drawer, Toast, Tooltip, Storybook setup, stories for all primitives (dark/light, 3 viewports).
- **S0-08 MSW + typed API layer + Dev Test Console shell** (FE): mock handlers setup, typed fetch wrapper, dev-only console UI on mock data. Teach: how MSW intercepts requests, contract-first development.
- **S0-09 FastAPI skeleton** (BE): `uv` project, app factory, `/healthz`, settings, structured logging, request ID. Teach: ASGI, uvicorn, request lifecycle, routers.
- **S0-10 Errors + database connection** (BE): problem+json error model, async engine for Supabase (pooler vs direct), `/readyz`.
- **S0-11 Migrations + core types** (BE): Alembic baseline, base model mixins, `Money`, `Clock`, hypothesis tests.
- **S0-12 Redis + ARQ worker skeleton** (BE).
- **S0-13 OpenAPI client + wiring + dev tooling** (WIRE/infra): OpenAPI export, generated TS client, landing health badge and Test Console connected to the real API, Makefile, `docker-compose`, `make dev`, `make check`, GitHub Actions CI (lint, types, tests, migration check, a11y). If it exceeds the limits, split CI into S0-14.

**→ S0 GATE.**

---

## S1 — Auth, roles, profiles (F1 + M1)
- **S1-01** FE Auth screens: login, register, reset, verify, shared form pattern (react-hook-form + zod), mock.
- **S1-02** FE Account shell: profile, addresses, become-a-seller, verification, suspended-account screens, mock.
- **S1-03** BE Identity foundation: users/profiles/roles tables + migration + RLS deny-by-default, Supabase JWT verification, `current_user` dependency, `GET/PATCH /me`, tests.
- **S1-04** BE Addresses CRUD (owner-scoped, 404 for others) + become seller + `seller_verifications` behind an interface with a fake adapter.
- **S1-05** BE Admin suspend/unsuspend + `audit_log` + per-request suspension check + route-auth enumeration test + JWT negative tests.
- **S1-06** WIRE `@supabase/ssr` cookies, real login/register/logout, middleware route guards, role-aware nav.
- **S1-07** WIRE `/me`, addresses, seller verification, suspended screen.

**→ S1 GATE.**

## S2 — Listings (F2 + M2)
- **S2-01** FE Wizard shell, stepper, draft state, ISBN step, condition/notes step (mock).
- **S2-02** FE Photo upload step, fulfillment comparison, price, review, My Listings with status chips and locked-field states (mock).
- **S2-03** BE `books`, `listings`, photos, status history tables + ISBN lookup provider (SSRF-safe) + endpoint.
- **S2-04** BE Create/patch listing with immutability rules (service + DB trigger), publish/deactivate, status transitions.
- **S2-05** BE Signed photo upload, validation, EXIF stripping.
- **S2-06** WIRE ISBN, create draft, autosave.
- **S2-07** WIRE Photos, publish, My Listings, deactivate.

**→ S2 GATE.**

## S3 — Search and listing detail (F3 + M3)
- **S3-01** FE BookCard, condition/fulfillment badges, search page, filters (rail and mobile sheet), skeletons (mock).
- **S3-02** FE Listing detail: gallery, purchase card, sticky mobile bar (mock).
- **S3-03** BE FTS + trigram indexes, seed script (≥ 500 listings), search endpoint with filters and cursor pagination.
- **S3-04** BE Detail endpoint, privacy rules (city/region only), availability freshness, performance test.
- **S3-05** WIRE Search, filters, URL state.
- **S3-06** WIRE Detail, SEO metadata, JSON-LD.

**→ S3 GATE.**

## S4 — Fees, ledger, tax, quote (F4 + M4 + M5)
**S4a (backend-only, gate via CLI/psql):**
- **S4-01** BE `region_config`, `fee_schedules`, `FeeCalculator`, hypothesis tests.
- **S4-02** BE Ledger tables, immutability triggers, balanced-journal trigger, `LedgerService`, demo CLI.

**→ S4a GATE.** Then **S4b** (settle merchant-of-record vs facilitator with the team lead before S4-04):
- **S4-03** FE Address picker, `FeeBreakdown`, `RegionNotice` (mock).
- **S4-04** BE `TaxProvider` interface, fake + Stripe Tax adapter, `POST /checkout/quote`.
- **S4-05** WIRE Quote in the UI.

**→ S4b GATE.**

## S5 — Orders, reservation, payment (F5 + M6 + M7)
**S5a:**
- **S5-01** FE Checkout shell and reservation countdown (mock).
- **S5-02** BE Orders tables, status history, partial unique index, reservation service (`FOR UPDATE`), `POST /orders`.
- **S5-03** BE Race test, reservation-expiry worker.
- **S5-04** WIRE Create order and countdown.

**→ S5a GATE.** **S5b:**
- **S5-05** FE Payment Element, success/failure/expired states (mock).
- **S5-06** BE `PaymentGateway`, pay endpoint, webhooks (signature, replay, idempotency).
- **S5-07** BE Capture → ledger journal → `paid_held`, refunds (full/partial) with reversing journals.
- **S5-08** WIRE End-to-end payment and confirmation page.

**→ S5b GATE.**

## S6 — Warehouse flow (F6 + M8)
- **S6-01** FE Seller inbound label/tracking UI + warehouse console shell and inbound queue (mock).
- **S6-02** FE Inspection form, locate book, pick/pack, ship (mock).
- **S6-03** BE Fulfillment tables, Strategy interface and registry, import-linter contract, inbound shipment + label (fake provider), inspection outcomes ("only pass makes it purchasable").
- **S6-04** BE Storage location + "where is book X", pick/pack task on purchase, ship with tracking.
- **S6-05** WIRE Seller side.
- **S6-06** WIRE Warehouse console.

**→ S6 GATE.**

## S7 — On-demand pickup (F7 + M9)
- **S7-01** FE Courier PWA: task list, pickup confirm (match / no match), delivery complete (mock).
- **S7-02** FE Dispatcher board + buyer/seller tracking UI (mock).
- **S7-03** BE On-demand tables, hubs, courier profiles, pickup task creation, auto/manual assignment, queued fallback.
- **S7-04** BE Courier endpoints, `no_match` → dispute hook, direct vs hub routing at dispatch time.
- **S7-05** BE Tracking endpoint + address-privacy tests.
- **S7-06** WIRE Courier app.
- **S7-07** WIRE Dispatcher and tracking.

**→ S7 GATE.**

## S8 — Disputes, delivery, EU withdrawal (F8 + M10)
- **S8-01** FE Orders list/detail, shared `OrderTimeline`, confirm receipt, open dispute, thread (mock).
- **S8-02** FE EU withdrawal + admin dispute resolution UI (mock).
- **S8-03** BE Disputes tables, open endpoint, window rule, payout block, resolution outcomes drive the ledger.
- **S8-04** BE Confirm receipt endpoint + EU withdrawal workflow.
- **S8-05** WIRE All screens to the real API.

**→ S8 GATE.**

## S9 — Payouts and seller finance (F9 + M11)
- **S9-01** FE Payout ledger and tax-info forms (mock).
- **S9-02** BE Payouts, release worker (confirm or window, whichever first), seller ledger endpoints, `tax_reporting_records`, admin CSV export.
- **S9-03** WIRE Seller finance screens.

**→ S9 GATE.**

## S10 — Ratings, notifications, admin (F10 + M12)
- **S10-01** FE Rating UI, notification center, admin tables (mock).
- **S10-02** BE Ratings rules and aggregates, notifications, domain events, email adapter.
- **S10-03** BE Admin list endpoints, cancel, suspension cascade.
- **S10-04** WIRE All of the above.

**→ S10 GATE.**

## S11 — Privacy and compliance (F11 + M13 part)
- **S11-01** FE Data export/erasure screens + legal pages (mock).
- **S11-02** BE Data export, erasure/anonymization, retention document, audit-log coverage, rate limiting everywhere.
- **S11-03** WIRE Privacy flows.

**→ S11 GATE.**

## S12 — Polish (F12)
- **S12-01** Motion presets + empty/error/skeleton parity.
- **S12-02** i18n scaffolding + offline and maintenance pages.

**→ S12 GATE.**

## S13 — Hardening and release (F13 + M13 rest)
- **S13-01** Full a11y audit + fixes, visual-regression baselines.
- **S13-02** Performance budgets, bundle analysis, security headers, CSP, secrets/rotation docs.
- **S13-03** Security scans, ASVS L2 checklist, traceability document (every FR/NFR → test).
- **S13-04** Load tests + chaos tests (provider/Redis down).
- **S13-05** Runbook, deploy config, backup/restore drill.

**→ FINAL GATE.**