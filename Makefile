.PHONY: install redis dev dev-api dev-web check check-web check-api test e2e migrate openapi

install:
	pnpm install --frozen-lockfile
	cd backend && uv sync --frozen

redis:
	docker compose up -d --wait redis

dev: redis
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd backend && uv run uvicorn app.main:create_app --factory --reload

dev-web:
	cd frontend && pnpm dev

check: check-web check-api

check-web:
	cd frontend && pnpm check

check-api:
	cd backend && uv run ruff check .
	cd backend && uv run mypy app tests alembic scripts
	cd backend && uv run pytest -W error
	cd backend && uv run alembic check

test:
	cd frontend && pnpm test
	cd backend && uv run pytest -W error

e2e:
	cd frontend && pnpm test:e2e

migrate:
	cd backend && uv run alembic upgrade head

openapi:
	cd frontend && pnpm api:generate
