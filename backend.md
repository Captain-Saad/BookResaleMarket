# backend.md — Used Book Resale Marketplace (v2, production architecture)

> **Audience: Claude Code.** This file is the single source of truth for the backend and for *how you work*. Read it fully at the start of every session, then read `PROGRESS.md`. If this file and a chat message conflict, ask the user. Product name `BookLoop` is a **placeholder**; keep it in one config constant.

---

## 0. READ FIRST — Non-negotiable working rules

### 0.1 Module gate (most important rule)
1. Work on **exactly one module at a time** (IDs `M0…M13`, §6).
2. When a module's tasks are done, tests are green and lint/type checks pass, **STOP**. Print the module's **"TEST GATE — manual checklist"** (from §6) plus exact commands to run the app and seed data.
3. **Do not start the next module** until the user writes `APPROVED M<n>`. If the user reports bugs, fix them inside the same module and re-print the gate.
4. Never "get ahead" by scaffolding future modules, creating future tables, or adding unused endpoints. Only what the current module needs.
5. Each module ends by updating `PROGRESS.md` (§0.4).

### 0.2 Git & PR rules (team-lead requirement)
- **2–3 commits per working day, minimum 2.** Commits are atomic and meaningful (e.g. model+migration, service+tests, router+docs). Never one giant commit; never empty/noise commits to hit the number.
- **Exactly one PR per working day**, opened at end of day (or when the day's slice is done). Team lead reviews it. A module may take several days → several slice PRs.
- **Branches:** `feat/m<n>-<slice>` (e.g. `feat/m4-ledger-core`). Never commit to `main`. Never force-push shared branches. **Never merge your own PR**; the team lead merges.
- If yesterday's PR is not merged yet, branch the new work from the previous feature branch (stacked PR) and say so in the PR description.
- **Conventional Commits:** `feat(listings): add condition-grade immutability guard`, `test(orders): prove double-purchase is rejected`, `fix`, `refactor`, `chore`, `docs`, `db` (migrations).
- **PR size:** aim < 400 changed lines excluding generated files/migrations/lockfiles. If bigger, split.
- Use `gh pr create` with `.github/pull_request_template.md`: *What / Why / FR-NFR IDs covered / How to test / Screenshots-or-curl / Migration notes / Security notes / Checklist*.
- Before every commit: run `make check` (ruff, mypy --strict, pytest -q, alembic check). Do not commit red code.
- At session end, print: commits made today (count), PR link, what the user must test, what is next.

### 0.3 Behaviour rules
- Ask before: adding a dependency not listed in §2, changing a decision in §3, deleting data/migrations, touching auth/payment/ledger code outside the active module.
- Never invent requirements. If the SRS is ambiguous, list the question, propose a default, and wait.
- Never put secrets in code, tests, logs, commits or PRs. `.env.example` only.
- Every business rule gets a test that proves it is **enforced** (NFR-8), not just the happy path.
- Keep functions small, typed, documented with the FR/NFR ID they implement in the docstring (`"""Implements FR-22."""`).
- Prefer boring, explicit code over cleverness. No dead code. No TODO without an issue reference.

### 0.4 `PROGRESS.md` (create in M0, update every session)
```
# PROGRESS
## Current module: M<n> — <name>   Status: in-progress | awaiting-user-test | approved
## Done modules: M0 ✅ (APPROVED <date>) …
## Today (<date>): commits <n>/2-3, PR <url|pending>
## Open questions: …
## Known gaps / tech debt: …
```

---

## 1. Product summary (rebuilt SRS)

A two-sided marketplace for **used physical books**, **US + EU/EEA**. A seller lists one physical copy and picks a fulfillment model **per listing**:

| | **Warehouse** | **On-Demand Pickup** |
|---|---|---|
| Book before sale | Platform warehouse | Seller's address |
| Purchasable | After intake inspection passes (may show "incoming") | Immediately |
| Condition verified | At intake | At courier pickup (after sale) |
| On sale | Pick/pack + outbound label | Courier pickup + delivery (direct or via hub) |
| Main risk | Seller never ships / intake mismatch | Book no longer matches at pickup |

Platform charges **both** seller fee and buyer fee. Buyer funds are **held (escrow)** until buyer confirms receipt or a post-delivery window elapses with no dispute.

**Central design problem:** the `Order` behaves differently downstream by fulfillment model, but **Payment, Payout, Fee, Tax and Dispute logic must be one implementation**. Solution: Strategy pattern for fulfillment only (§4.3).

Actors: Anonymous visitor, Buyer, Seller (one account may be both), Warehouse Staff, Courier, Dispatcher (sub-role of Admin/ops), Platform Admin.

Out of scope v1: non-book items, rental/subscription, in-app chat (order notifications only), multi-seller cart fulfillment, dynamic pricing, regions beyond US/EU/EEA. The return-to-seller/donation flow for deactivated warehouse listings (FR-6) is stubbed as a status + admin task only.

---

## 2. Technology stack (fixed)

| Concern | Choice |
|---|---|
| Runtime | Python 3.12+, FastAPI (async), Pydantic v2, `uv` for deps |
| DB | **Supabase Postgres** (schema owned by Alembic, *not* the dashboard) |
| ORM | **SQLAlchemy 2.0 (async, typed `Mapped[]`) + Alembic**. Chosen over Prisma/SQLModel/Django-ORM because we need row-level locks (`SELECT … FOR UPDATE`), partial unique indexes, exclusion constraints, deferred constraint triggers and raw SQL escape hatches. |
| Driver | `asyncpg`. Connect via Supabase **pooler**; with transaction-mode pgbouncer set `statement_cache_size=0` and `prepared_statement_name_func` appropriately. Migrations use the **direct** connection. |
| Auth | **Supabase Auth** issues JWTs; FastAPI **verifies** them (JWKS/`aud`/`iss`/`exp`) and maps `sub` → `users.id`. Roles live in our DB (`user_roles`), never trusted from client-editable JWT claims. |
| Storage | Supabase Storage (private buckets, signed URLs) for listing photos/ID docs |
| Jobs/queue | Redis + **ARQ** (async) for webhooks fan-out, label generation, courier assignment, payout release, reservation expiry, emails |
| Payments | **Stripe Connect** (separate charges & transfers → platform holds funds, transfers on release) behind `PaymentGateway` protocol. *Verify current Stripe docs/limits at implementation time (hold duration, EU requirements).* |
| Tax | Stripe Tax (or TaxJar-style) behind `TaxProvider` protocol — no hand-maintained rate tables |
| Shipping | `ShippingProvider` protocol; real adapter (e.g. EasyPost/Shippo) + `FakeShippingProvider` for dev/tests |
| Courier | `CourierDispatchProvider` protocol; in-house adapter first |
| ISBN | `IsbnLookupProvider` (Open Library / Google Books) + manual fallback; SSRF-safe |
| Email/notify | `Notifier` protocol (email adapter + in-app notification table) |
| Observability | structlog JSON logs, OpenTelemetry traces, Sentry, `/healthz` `/readyz` |
| Testing | pytest, pytest-asyncio, httpx, testcontainers-postgres (real PG, no SQLite), hypothesis for money math, `respx` for HTTP mocks |
| Quality | ruff, mypy --strict, pre-commit, `pip-audit`/`uv pip audit`, `bandit`, gitleaks |
| CI | GitHub Actions: lint → types → tests (PG + Redis services) → migration check → security scans |
| Monorepo | `pnpm` workspaces for web; `uv` for api |

Repo layout:
```
bookloop/
├─ CLAUDE.md                 # 5 lines: "Read backend.md / frontend.md / PROGRESS.md first"
├─ backend.md  frontend.md  PROGRESS.md
├─ Makefile                  # check, test, dev, migrate, seed, openapi
├─ docker-compose.yml        # redis, (optional local pg), mailhog
├─ supabase/                 # config.toml, seed notes, storage bucket policies
├─ packages/api-client/      # generated TS client from OpenAPI (frontend consumes)
├─ apps/
│  ├─ web/                   # Next.js (see frontend.md)
│  └─ api/
│     ├─ alembic/ …
│     ├─ app/
│     │  ├─ main.py
│     │  ├─ core/            # config, db, security, deps, errors, logging, rate_limit, idempotency, money, clock
│     │  ├─ modules/<name>/  # models.py schemas.py repository.py service.py router.py (+ state_machine.py) 
│     │  ├─ integrations/<provider>/  # base.py (Protocol), real.py, fake.py
│     │  └─ workers/         # arq tasks + cron
│     └─ tests/              # unit/ integration/ e2e/ factories/
```
Dependency direction: `router → service → repository → models`. Services never import routers. Modules talk through service interfaces or domain events, not each other's tables.

---

## 3. Architecture decisions (do not change without asking)

1. **Money:** integer minor units + ISO currency (`Money(amount_minor:int, currency:str)`). Never floats. Hypothesis tests for rounding/allocation.
2. **Region:** enum `US | EU`. Derived from **buyer delivery address country** (FR-29). Region config (currency, tax mode, fee table, disclosures, withdrawal window) lives in a single `region_config` table/module (NFR-6) — no `if region == …` scattered in services.
3. **IDs:** UUIDv7 primary keys; human-readable `order_number` separately.
4. **Timestamps:** `timestamptz` UTC; injectable `Clock` for tests.
5. **Soft-delete / immutability (NFR-5):** orders, payments, payouts, disputes, ledger, courier tasks, status history are **never hard-deleted**; enforced with DB triggers that raise on `DELETE`, and `UPDATE` is blocked on ledger tables.
6. **State machines are explicit** (`transitions` table in code + DB `CHECK` on allowed statuses + `*_status_history` rows). Illegal transitions raise `InvalidTransition` → HTTP 409.
7. **Ledger (NFR-3):** append-only **double-entry** ledger. Every money movement = a `journal` with ≥2 `ledger_entries` summing to zero (deferred constraint trigger enforces it). Payout amount = `SUM` over the order's ledger entries — never "current balance".
8. **Idempotency:** all mutating money endpoints and all webhooks require/record an idempotency key (`idempotency_keys` table, unique on key+scope).
9. **Concurrency (NFR-4):** listing purchase uses `SELECT … FOR UPDATE` on the listing row **and** a DB-level guarantee: partial unique index on `orders(listing_id) WHERE status NOT IN ('cancelled','expired','refunded')`. Both must exist.
10. **API contract:** REST JSON, `/api/v1`, OpenAPI is the contract; cursor pagination; RFC 7807 problem+json errors with stable `code` strings; `X-Request-ID` on every response.
11. **RLS = defense in depth:** enable RLS on every table in `public`, **deny by default**. Backend connects with a privileged role; the browser **never** queries tables directly (only Supabase Auth + signed Storage uploads). Authorization is enforced in the API (§5).
12. **Fulfillment Strategy (§4.3)** is the only place the two models diverge.

---

## 4. Domain model

### 4.1 Entities (tables)
`users`, `profiles`, `user_roles`, `seller_verifications`, `addresses`, `books` (ISBN metadata cache), `listings`, `listing_photos`, `listing_status_history`, `inbound_shipments`, `storage_locations`, `orders`, `order_status_history`, `order_tax_lines`, `fulfillments` (+ `warehouse_fulfillments`, `ondemand_fulfillments`), `pickup_tasks`, `delivery_tasks`, `hubs`, `courier_profiles`, `payments`, `payouts`, `refunds`, `ledger_accounts`, `journals`, `ledger_entries`, `fee_schedules`, `region_config`, `disputes`, `dispute_events`, `withdrawal_requests` (EU), `ratings`, `notifications`, `idempotency_keys`, `webhook_events`, `audit_log`, `data_requests` (GDPR), `tax_reporting_records`.

### 4.2 Key state machines
- **Listing:** `draft → incoming (warehouse only) → active → reserved → sold`; side: `deactivated`, `suspended`, `intake_failed`.
- **Order (identical for both models):** `pending_payment → paid_held → fulfilling → delivered → completed`; side: `disputed`, `cancelled`, `refunded`, `expired`.
- **Payment:** `requires_payment → captured_held → partially_refunded | refunded | released` (released = seller transfer done).
- **Payout:** `pending → eligible → released | blocked(dispute) | reversed`.
- **Warehouse fulfillment:** `awaiting_inbound → received → inspected(pass|mismatch|damaged|not_received) → stored → pick_pack → shipped → delivered`.
- **On-demand fulfillment:** `awaiting_assignment → assigned → picked_up(match|no_match) → in_transit [→ at_hub → out_for_delivery] → delivered`.
- **Dispute:** `open → under_review → resolved(full_refund|partial_refund|release_to_seller)`.

### 4.3 Fulfillment Strategy
```python
class FulfillmentStrategy(Protocol):
    async def on_order_paid(self, order) -> None: ...      # warehouse: create pick/pack task; on-demand: create pickup task
    async def on_cancel(self, order) -> None: ...
    async def delivery_status(self, order) -> FulfillmentView: ...
    def delivered_event(self) -> DomainEvent: ...           # both emit the same OrderDelivered
registry = {"warehouse": WarehouseFulfillment(), "on_demand": OnDemandFulfillment()}
```
`OrderService` calls `registry[listing.fulfillment_model]` and **nothing else** branches on the model. Payment/Payout/Fee/Tax/Dispute code must not import either strategy. A test asserts this via an import-linter contract.

### 4.4 Fee model (FR-23)
`fee_schedules(region, side[buyer|seller], kind[flat|percent|combo], flat_minor, percent_bps, min_minor, max_minor, effective_from)`; versioned, never edited in place; the fee schedule id used is stored on the order for audit.

---

## 5. Security requirements (apply to every module)

**Authentication & session**
- Verify Supabase JWT on every request (signature via JWKS cache, `iss`, `aud`, `exp`, `nbf`); reject `alg=none`. Short access tokens; refresh handled by Supabase on the web side via HttpOnly cookies (`@supabase/ssr`).
- MFA required for Admin, Warehouse Staff, Dispatcher; strongly encouraged for sellers (payout changes require recent re-auth).
- Account suspension (FR-35) is checked **per request** (cached ≤ 30 s) so it takes effect immediately.

**Authorization**
- Central `require_roles(...)` and `require_owner(resource)` dependencies. **Every** endpoint declares its policy; a test enumerates all routes and fails if any lacks an explicit auth dependency (public ones are on an allowlist).
- Prevent IDOR/BOLA: always scope queries by owner (`WHERE seller_id = :me`); return 404 (not 403) for other users' resources.
- Mass-assignment protection: separate Pydantic *input* schemas (no `role`, `status`, `fee`, `price_final` from clients). Server computes all money.

**Input/output**
- Pydantic strict models, max lengths, enums, ISBN checksum validation, image MIME sniffing + size limits + EXIF stripping, virus-scan hook for uploads, filename randomization.
- Output schemas whitelist fields; **never** return precise seller address before pickup assignment (FR-8): city/region only. Courier sees address only for assigned, active tasks.
- SSRF guard on ISBN lookup (allowlisted hosts, timeouts, no redirects to private IPs).

**Transport/app hardening**
- HTTPS only, HSTS, strict CORS allowlist (web origin only), `TrustedHost`, security headers on API, request size limits, timeouts.
- Rate limiting (Redis, sliding window): auth, listing create, checkout, dispute open, search (per IP + per user). 429 with `Retry-After`.
- CSRF: API is bearer-token; web uses SameSite=Lax HttpOnly cookies + origin checks on state-changing BFF routes.

**Payments & webhooks (NFR-1)**
- Never store PAN/CVV; only processor tokens/ids. Stripe Elements on client. PCI SAQ-A posture.
- Verify webhook signatures; store raw event id in `webhook_events` (unique) → exactly-once processing; replay-safe; return 2xx fast and process async.
- Amounts are recomputed server-side at capture; never trust client totals. Reconcile job compares processor balance vs ledger daily and alerts on drift.

**Data protection (NFR-2)**
- PII encrypted at rest (Supabase disk + column-level encryption via `pgcrypto`/app-level AES-GCM for ID document refs, tax IDs, phone). Keys from env/secret manager, rotation documented.
- Data minimization per region; lawful basis recorded; **export** (`/me/data-export`) and **erasure** (`/me/erase`) implemented as `data_requests`. Erasure **anonymizes** PII but retains immutable financial/tax records for the legally required period (NFR-5 vs GDPR: document the retention matrix in `docs/retention.md`).
- Logs never contain PII/tokens/card data (structlog processor scrubs `email, phone, address, authorization, token`).

**Supply chain & ops**
- Dependabot, `pip-audit`, `bandit`, `gitleaks` in CI; pinned lockfiles; minimal Docker image (non-root, read-only FS).
- Audit log (`audit_log`) for admin actions, role changes, refunds, payout releases, suspensions, data exports.
- OWASP ASVS L2 as the checklist; M13 produces a signed-off security review.

---

## 6. Phases & modules

Legend per module: **Goal · FR/NFR · DB · Endpoints · Rules → tests · Commit plan · TEST GATE (user's manual checklist)**.
Every module also: factories, OpenAPI docs with examples, migrations that are reversible, no lint/type errors.

### PHASE A — Foundation

#### M0 — Project foundation & tooling
- **Goal:** runnable skeleton, CI, conventions.
- **Build:** monorepo, `uv` project, FastAPI app factory, settings (pydantic-settings, fail-fast on missing env), structlog, error handler (problem+json), `/healthz` `/readyz`, SQLAlchemy async engine for Supabase pooler, Alembic wired to direct URL, base mixins (id, timestamps), `Money` type, `Clock`, Redis + ARQ skeleton, Makefile, pre-commit, GitHub Actions, PR template, `PROGRESS.md`, `CLAUDE.md`, `.env.example`, `docker-compose.yml`, OpenAPI export script → `packages/api-client`.
- **Tests:** health endpoints, settings validation, money math (hypothesis), migration up/down.
- **Commits:** (1) repo+tooling, (2) app core+db, (3) CI+docs.
- **TEST GATE:** `make dev` boots; `/healthz` 200; `/docs` loads; `make check` green; `alembic upgrade head && alembic downgrade base` works against Supabase dev project; CI green on PR.

#### M1 — Identity, roles, profiles, seller verification (FR-33, 34, 35; NFR-2 partly)
- **DB:** `users, profiles, user_roles, addresses, seller_verifications, audit_log`.
- **Endpoints:** `GET/PATCH /me`, `POST /me/roles/seller` (become seller), `CRUD /me/addresses`, `POST /me/seller-verification` (starts Stripe Connect onboarding/identity), `POST /admin/users/{id}/suspend|unsuspend`, `GET /admin/users`.
- **Rules → tests:** one account can be buyer+seller; seller **cannot make a listing purchasable** until verified (FR-34); suspended user is rejected on the next request (FR-35); role escalation via API impossible; JWT validation negatives (expired, wrong aud, bad sig); route-auth enumeration test.
- **Commits:** (1) models+migration+RLS, (2) auth deps + JWT verification, (3) endpoints+tests.
- **TEST GATE:** register via Supabase (web or curl), call `/me`; become seller; start verification (test mode); admin suspends user → their next call returns 403 `account_suspended`; non-admin calling admin route → 403/404.

### PHASE B — Catalog

#### M2 — Books, listings, photos (FR-1, 2, 5, 6; FR-8 data rules)
- **DB:** `books, listings, listing_photos, listing_status_history`.
- **Endpoints:** `GET /isbn/{isbn}`, `POST /listings` (draft), `PATCH /listings/{id}`, `POST /listings/{id}/photos/upload-url` (signed URL), `POST /listings/{id}/publish`, `POST /listings/{id}/deactivate`, `GET /me/listings`.
- **Rules → tests:** ISBN-10/13 checksum; fulfillment model required & **immutable once a buyer has committed** (FR-2); price/photos/notes editable until purchased (FR-5); **condition grade + ISBN immutable once purchasable** (FR-5; DB trigger + service); deactivate before purchase only (FR-6); warehouse deactivation after intake creates `return_or_donation_pending` stub; seller location exposed as city/region only; photo type/size limits.
- **Commits:** (1) models+migration, (2) service rules+tests, (3) router+signed upload.
- **TEST GATE:** create warehouse + on-demand drafts; try changing ISBN/condition after publish → rejected; upload photos; deactivate; confirm no precise address in any public payload.

#### M3 — Search & browse (FR-7, 8, 9)
- **DB:** Postgres full-text (`tsvector` on title/author) + `pg_trgm`, composite indexes; materialized or generated columns as needed.
- **Endpoints:** `GET /listings?q=&isbn=&author=&condition=&min_price=&max_price=&fulfillment=&cursor=`, `GET /listings/{id}`.
- **Rules → tests:** only `active` (and `incoming` flagged) appear; **reserved/sold never shown as available** (FR-9; no caching of availability beyond ≤ 2 s, ETag off for availability); filters combine correctly; cursor pagination stable; estimated delivery window computed per fulfillment model; query injection safety; performance test with 50k seeded listings (p95 < 200 ms locally).
- **TEST GATE:** run `make seed` (≥ 500 listings); try each filter; buy-simulate (set a listing to reserved via SQL helper) and watch it vanish from search immediately.

### PHASE C — Money core

#### M4 — Ledger, fees, region config (NFR-3, FR-23)
- **DB:** `ledger_accounts, journals, ledger_entries, fee_schedules, region_config`; triggers: no UPDATE/DELETE on ledger; deferred trigger enforcing journal sums to zero.
- **Service:** `FeeCalculator`, `LedgerService.post(journal)`, `balance_for(order)`.
- **Rules → tests:** unbalanced journal rejected **by the DB**; ledger immutability; fee calc for flat / percent / combo, min/max, per side, per region; fee schedule versioning (old orders keep old schedule); rounding allocation sums exactly (hypothesis property tests).
- **TEST GATE:** run CLI `make demo-fees ORDER=…` for sample cases (US/EU, flat/percent/combo) and check numbers by hand; try `UPDATE ledger_entries` in psql → error.

#### M5 — Tax & checkout quote (FR-20, 29, 30; NFR-6)
- **Integration:** `TaxProvider` (Stripe Tax adapter + deterministic `FakeTaxProvider`).
- **Endpoint:** `POST /checkout/quote {listing_id, address_id}` → itemized `item, buyer_fee, tax_lines[], delivery, total, currency, region, disclosures[]`.
- **Rules → tests:** region derived **only** from delivery address (FR-29); US state/local by ship-to, EU VAT by member state (FR-30); `order_tax_lines` shape persisted-ready; EU quote includes withdrawal-right disclosure keys (FR-31 text delivered by region config); provider outage degrades gracefully (clear error, no partial order).
- **TEST GATE:** quote the same listing to a US-CA, US-TX, DE, FR address; verify itemization; verify currency/disclosures differ by region.
- **Open business decision (ask the user at M5 start):** merchant-of-record vs facilitator tax treatment. Data model supports both.

#### M6 — Order creation, reservation & concurrency (FR-9, 21 (setup); NFR-4, 5)
- **DB:** `orders, order_status_history, order_tax_lines`, partial unique index on active order per listing.
- **Endpoints:** `POST /orders` (reserve listing 10 min, create `pending_payment` with frozen quote), `GET /orders/{id}`, `GET /me/orders`, `POST /orders/{id}/cancel` (before payment).
- **Rules → tests:** **two buyers racing** (asyncio.gather ×50 against real PG) → exactly one order; DB constraint holds even if the service lock is bypassed; reservation expiry worker releases listing; warehouse listing in `incoming` not purchasable (FR-4); seller cannot buy own listing; price frozen at reservation; orders never hard-deleted.
- **TEST GATE:** run `make race-test`; two browser sessions try to buy the same book; expiry works (set TTL=1 min in dev).

#### M7 — Payments, escrow & webhooks (FR-20, 21, 22 (setup), 25; NFR-1, 3, 7)
- **Integration:** `PaymentGateway` (Stripe + Fake). Separate charges & transfers.
- **Endpoints:** `POST /orders/{id}/pay` (creates PaymentIntent, returns client secret), `POST /webhooks/stripe`, admin `POST /admin/orders/{id}/refund {amount?}`.
- **Rules → tests:** capture → `captured_held` + ledger journal (buyer cash → platform escrow, fees recognized); **no seller transfer at capture**; webhook signature + replay + out-of-order handling; amount tampering impossible; full/partial refund posts reversing journals; payout reversed if not released, seller reconciliation entry if released (FR-25); card data never touches our logs/DB (grep test).
- **TEST GATE:** pay with Stripe test cards (success, 3DS, decline); watch order → `paid_held`; refund full/partial; inspect ledger via `make ledger ORDER=…`; replay a webhook → no double posting.

### PHASE D — Fulfillment

#### M8 — Fulfillment framework + Warehouse flow (FR-3, 4, 10–14)
- **DB:** `fulfillments, warehouse_fulfillments, inbound_shipments, storage_locations`.
- **Endpoints:** seller `POST /listings/{id}/inbound-label`; staff `GET /warehouse/inbound`, `POST /warehouse/inbound/{id}/inspect {outcome}`, `POST /warehouse/books/{id}/locate`, `GET /warehouse/books/{id}/location`, `GET /warehouse/pick-tasks`, `POST /warehouse/orders/{id}/ship {tracking}`.
- **Rules → tests:** prepaid label creation + status tracking (FR-3); **only `pass` makes listing purchasable**, other outcomes create seller notification + resolution task, never silent failure (FR-11); "where is book X" always answerable until shipped (FR-12); purchase auto-creates pick/pack task + outbound label (FR-13); shipping records tracking & updates order (FR-14); async label generation with retry (NFR-7); Strategy registry wired and import-linter contract in place.
- **TEST GATE:** as seller create a warehouse listing → get label; as staff inspect `pass` → listing becomes buyable; test each failing outcome; buy it; pick/pack → ship with tracking; locate-book query works.

#### M9 — On-Demand pickup & courier flow (FR-15–19)
- **DB:** `ondemand_fulfillments, pickup_tasks, delivery_tasks, hubs, courier_profiles`.
- **Endpoints:** dispatcher `GET /dispatch/tasks`, `POST /dispatch/tasks/{id}/assign`, `POST /dispatch/tasks/{id}/route {direct|hub, hub_id}`; courier `GET /courier/tasks`, `POST /courier/pickups/{id}/complete {match|no_match, photo}`, `POST /courier/deliveries/{id}/complete`; buyer/seller `GET /orders/{id}/tracking`.
- **Rules → tests:** purchase creates pickup task with seller address visible **only** to the assigned courier (FR-15); auto-assign + manual assign; `no_match` → order routed to dispute flow, **delivery not created** (FR-17); routing strategy chosen at dispatch time, not stored as order property (FR-18); status visible to buyer & seller (FR-19); queued assignment if no courier available (NFR-7).
- **TEST GATE:** buy an on-demand listing; dispatcher assigns; courier completes pickup with `match` → delivery → delivered; repeat with `no_match` → dispute created; try hub route; verify seller exact address never leaks to buyer/other courier.

### PHASE E — Resolution & settlement

#### M10 — Disputes, EU withdrawal & delivery confirmation (FR-26, 27, 28, 31)
- **DB:** `disputes, dispute_events, withdrawal_requests`.
- **Endpoints:** `POST /orders/{id}/confirm-receipt`, `POST /orders/{id}/disputes`, `GET /disputes/{id}`, admin `GET /admin/disputes`, `POST /admin/disputes/{id}/resolve {outcome, amount?}`, EU `POST /orders/{id}/withdrawal`.
- **Rules → tests:** dispute allowed only within configurable window after delivery; **dispute pauses payout** (FR-27); resolution outcomes limited to the fixed set and **automatically** drive refund/release via the ledger (FR-28); EU withdrawal workflow separate from disputes and available only for EU orders within the statutory window (FR-31); every transition audited.
- **TEST GATE:** deliver an order → open dispute → payout shows `blocked`; resolve each outcome and check ledger/refund/payout result; EU order withdrawal vs US order (not offered).

#### M11 — Payout release, seller ledger, tax reporting (FR-22, 24, 32)
- **Worker:** `release_eligible_payouts` (cron): release when **buyer confirmed OR window elapsed without dispute, whichever first**.
- **Endpoints:** `GET /me/payouts`, `GET /me/ledger`, admin `GET /admin/payouts`, `POST /admin/payouts/{id}/hold`.
- **DB:** `payouts, tax_reporting_records`.
- **Rules → tests:** early confirm releases immediately; window path releases at T+N days; blocked by dispute/suspension; payout amount derived from ledger (a test mutates "balance" caches and proves payout unaffected); idempotent release (double-run safe); reporting records capture only the minimum data per region (US 1099-K thresholds, EU DAC7) and export CSV for admin.
- **TEST GATE:** use time-travel CLI (`make advance-clock DAYS=n`) to trigger release; check seller ledger statuses pending → released; export tax report sample.

### PHASE F — Trust, ops, hardening

#### M12 — Ratings, notifications, admin console APIs (FR-35 (full), 36)
- **DB:** `ratings, notifications`.
- **Endpoints:** `POST /orders/{id}/ratings`, `GET /users/{id}/ratings`, `GET /me/notifications`, `PATCH /notifications/{id}/read`, admin `GET /admin/orders|listings|payouts|disputes` (filters), admin `POST /admin/orders/{id}/cancel`.
- **Rules → tests:** rate only after completion, once per party per order; aggregate rating on profile/listing; suspended seller's live listings deactivate immediately (FR-35); event-driven notifications for each state change (email + in-app).
- **TEST GATE:** complete an order, both parties rate; aggregate updates; suspend a seller mid-flight → listings vanish from search.

#### M13 — Security hardening, GDPR, performance, release readiness (NFR-1, 2, 5, 6, 7, 8)
- **Build:** GDPR export & erasure workflow + retention doc; full audit-log coverage; rate limiting everywhere; security headers; secrets rotation doc; backup/restore drill on Supabase (PITR); load tests (k6/locust) on search + checkout; chaos tests (payment provider down, courier API down, Redis down → graceful degradation); coverage report mapping **every FR/NFR → test file** (`docs/traceability.md`); OWASP ASVS L2 checklist; dependency + container scans; runbook (`docs/runbook.md`); deploy config (container + env matrix: dev/staging/prod).
- **TEST GATE:** run `make traceability` (no unmapped FR/NFR); run `make security-scan`; request data export + erasure for a test user and verify financial records remain anonymized-but-intact; kill Redis during checkout and confirm purchase still completes with queued downstream work.

---

## 7. Cross-cutting definition of done (every module)
- [ ] Code typed, linted, `make check` green; CI green
- [ ] Migrations reversible, RLS enabled on new tables, indexes for every query path
- [ ] Authorization policy declared on every new route + negative tests
- [ ] Business rules have enforcement tests (NFR-8 list: FR-2, 4, 11, 17, 21, 22, 23, 27, 28, 30, 34)
- [ ] OpenAPI regenerated and `packages/api-client` rebuilt (frontend depends on it)
- [ ] Structured logs + audit entries for sensitive actions; no PII in logs
- [ ] Seed/demo data updated; `PROGRESS.md` updated
- [ ] TEST GATE printed and **stopped** for user approval

## 8. Traceability seed (FR/NFR → module)
FR-1,2,5,6 → M2 · FR-3,4,10–14 → M8 · FR-7,8,9 → M3 (+M2 rules) · FR-15–19 → M9 · FR-20 → M5/M7 · FR-21 → M7 · FR-22,24,32 → M11 · FR-23 → M4 · FR-25 → M7 · FR-26–28 → M10 · FR-29,30 → M5 · FR-31 → M5/M10 · FR-33,34,35 → M1 (+M12) · FR-36 → M12 · NFR-1 → M7 · NFR-2 → M1/M13 · NFR-3 → M4 · NFR-4 → M6 · NFR-5 → M4/M6/M13 · NFR-6 → M4/M5 · NFR-7 → M7/M8/M9/M13 · NFR-8 → every module.

## 9. Start instruction
Begin with **M0 only**. After finishing, print the M0 TEST GATE and wait for `APPROVED M0`. Also read `frontend.md`: frontend modules `F0…F13` are executed **after** the matching backend module is approved (mapping in frontend.md §9), under the same gate and git rules.
