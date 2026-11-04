# BookLoop

A marketplace for buying and selling used books. ("BookLoop" is a placeholder name, set in `frontend/lib/constants.ts`.)

## Repository layout

```
.
├── docs/                  # ROADMAP.md, backend.md, frontend.md
├── frontend/              # Next.js app (App Router, TypeScript, Tailwind)
├── backend/               # FastAPI app (uv, SQLAlchemy, Alembic, ARQ)
├── packages/api-client/   # TypeScript types generated from the API's OpenAPI schema
├── docker-compose.yml     # Redis for local development
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
| `make dev` | Starts Redis, the API on http://localhost:8000 and the web app on http://localhost:3000 |
| `make check` | Lint, format, types and unit tests for both apps, plus `alembic check` (needs the database) |
| `make test` | Unit tests for both apps |
| `make e2e` | Playwright end-to-end and accessibility tests |
| `make migrate` | Applies database migrations |
| `make openapi` | Regenerates `packages/api-client` from the API |

CI runs these checks on every pull request, using its own Postgres and Redis (`.github/workflows/ci.yml`).
