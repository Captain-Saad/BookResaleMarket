# BookLoop

A marketplace for buying and selling used books. ("BookLoop" is a placeholder name, set in `frontend/lib/constants.ts`.)

## Repository layout

```
.
├── docs/                  # ROADMAP.md, backend.md, frontend.md
├── frontend/              # Next.js app (App Router, TypeScript, Tailwind)
├── backend/               # FastAPI app (uv, SQLAlchemy, Alembic, ARQ)
├── packages/api-client/   # TypeScript types generated from the API's OpenAPI schema
├── docker-compose.yml     # Redis and a test email inbox for local development
└── Makefile               # the commands below
```

## Requirements

- Node.js 24 (`.nvmrc`) and pnpm 10 (`corepack enable` picks the pinned version)
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Docker, for Redis

## Setup

```bash
make install
cp backend/.env.example backend/.env           # then fill in the database URLs
cp frontend/.env.example frontend/.env.local
make migrate
```

Each app documents its variables in its own `.env.example`. Real `.env*` files are gitignored and must never be committed.

## Commands

| Command | What it does |
|---|---|
| `make dev` | Starts Redis, the test inbox on http://localhost:8025, the API on http://localhost:8000 and the web app on http://localhost:3000 |
| `make check` | Lint, format, types and unit tests for both apps, plus `alembic check` (needs the database) |
| `make test` | Unit tests for both apps |
| `make e2e` | Playwright end-to-end and accessibility tests |
| `make e2e-stack` | Browser tests against the real API, a throwaway database and the test inbox |
| `make lighthouse` | Lighthouse scores for public pages against the budgets in `docs/frontend.md` |
| `make audit` | Dependency vulnerability scans and bandit |
| `make hooks` | Optional: installs pre-commit hooks for gitleaks, ruff, ESLint and Prettier |
| `make migrate` | Applies database migrations |
| `make openapi` | Regenerates `packages/api-client` from the API |

CI runs these checks on every pull request, using its own Postgres and Redis (`.github/workflows/ci.yml`). Browser stack tests verify the application against isolated local PostgreSQL; they do not verify the availability or credentials of the Supabase project configured in `backend/.env`.

Before testing your configured development environment, start services and check `http://localhost:8000/readyz`. `/healthz` only confirms that the API process is running. A `503 database_unavailable` means database connectivity needs attention. Public views hide stale availability and back off failed reads exponentially up to 30 seconds; successful reads restore the normal refresh interval. Supabase pooler `EAUTHQUERY` and `ECIRCUITBREAKER` errors happen before the application query executes: check the project's database status and the current connection strings in its dashboard. Correct credentials locally if needed, then allow a temporary circuit breaker to recover before retrying. Do not repeatedly retry incorrect credentials, paste secrets into issue reports, or replace the hosted database with the disposable test database to hide the failure.


### S2 listing workflow

Run `make services`, `make migrate`, then `make dev`. Sign in, become a seller at `/account/seller`, start verification, and add a pickup/return address at `/account/addresses`. A verified seller can publish from `/sell`; incomplete drafts autosave and can be reopened at `/sell/listings`.

For local testing, grant an administrator role with `cd backend && uv run python -m scripts.grant_role YOUR_EMAIL admin`, then sign in as that administrator and use **Dev test console → Seller verification** to mark a seller who has started verification as verified. This console and verification endpoint are unavailable in production. The role switch/reset console buttons remain placeholders. Seeding uses an existing verified seller with an address; it does not create accounts.

Upload up to six JPEG/PNG/WebP photos, 5 MiB each and 20 megapixels. Local development uses private files under `backend/var/listing-photos`; production needs the private Supabase bucket settings in `backend/.env.example`. Upload completion re-encodes images and removes EXIF. The malware scan hook still needs a real production adapter, and private orphan cleanup must be configured before launch.

On-demand publish makes a listing active; warehouse publish leaves it incoming until a later warehouse slice implements intake. ISBN and condition lock permanently after the listing becomes purchasable. Buyer commitment locks sale details/photos. An address used by an incoming, active, reserved or sold listing cannot be deleted until its listing changes or is deactivated.

Run `make check` and `make e2e-stack`. The stack suite uses the isolated `postgres-test` service, the real API and Mailpit. Its listing flow runs at phone, tablet and desktop sizes, checks dark/light accessibility and captures review screenshots. Do not point `E2E_DATABASE_URL` at a development or production database.


### S3 public catalog and demo data

After seller setup above, run `make migrate` and `make seed` to add 500 clearly labeled demo copies. Repeating the seed skips existing copies. The admin-only, non-production Dev test console Seed button runs the same seed. It creates sample photos in the configured private storage. The CLI refuses production settings. To seed a larger development dataset: `cd backend && uv run python -m scripts.seed_listings --count 50000`.

Public `GET /api/v1/listings` supports text, ISBN, author, condition, fulfillment and currency-aware price filters with cursor pagination. Search includes active and incoming copies; reserved/sold detail pages stay visible but unavailable. Seller location is city/region/country only. Suspended or unverified sellers are excluded on every request. Availability responses use no-store without ETags. Delivery estimates use the approved checkout placeholder until timing rules exist.

`make perf-search` runs the explicit 50,000-listing p95 < 200 ms search gate against throwaway test-container data. This benchmark is separate from routine `make check`; Docker is required. The `/books` catalog uses the real API, renders initial results on the server, and keeps filters in its URL. Copy/reload a filtered URL or use browser back/forward to restore it. Visible stock refreshes every second; stale results are hidden after failed or hanging refreshes. Listing details also render initial public data on the server, refresh availability, and include canonical/OpenGraph metadata and escaped Book/Offer JSON-LD. Reserved/sold copies remain visible with purchasing disabled. Set NEXT_PUBLIC_SITE_URL to the deployed website origin for canonical URLs. Home search submits native GET URLs to the catalog. Public photos are optimized to AVIF/WebP by Next using a strict API photo-path allowlist. `/robots.txt` lists the segmented `/sitemap/start.xml` and cursor-based sitemap files; each contains up to 10,000 public book URLs, including visible reserved/sold copies. Sitemap data exposes IDs/modification dates only, using the same seller visibility rules. Base catalog/home URLs are canonical; filtered catalog URLs are noindex.

For the S3 stock simulation, run `cd backend && uv run python -m scripts.reserve_listing LISTING_UUID` using an active demo copy. This non-production CLI changes stock only; it creates no order/payment. The copy must disappear from search while its detail stays visible and unavailable. The normal database purchase lock applies, so use disposable demo data.

Missing/private public API records return HTTP 404. The existing app-wide Next loading boundary can start a streamed frontend response with HTTP 200 before not-found resolves; the frontend still renders the not-found page with noindex metadata and no book structured data or private content.


Public catalog reads can use BOOKLOOP_PUBLIC_DATABASE_URL with a direct or session-pool connection. It must not point at Supabase transaction mode (port6543): cached prepared statements and autocommit reads require a stable session. When absent, public reads keep the original transactional pool. Authentication and mutations always keep their existing transactional connection. This setting avoids extra transaction round trips without caching availability or increasing its two-second lifetime.
