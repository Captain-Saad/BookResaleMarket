.PHONY: install hooks redis dev dev-api dev-web check check-web check-api test e2e lighthouse audit migrate openapi

install:
	pnpm install --frozen-lockfile
	cd backend && uv sync --frozen

hooks:
	cd backend && uv run pre-commit install

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

lighthouse:
	cd frontend && pnpm build && CHROME_PATH="$$(node -e "console.log(require('@playwright/test').chromium.executablePath())")" pnpm lighthouse

audit:
	cd frontend && pnpm audit --prod
	cd backend && uv export --frozen --no-dev --no-emit-project --no-hashes | uvx pip-audit==2.10.1 --disable-pip --no-deps -r /dev/stdin
	cd backend && uvx bandit==1.9.4 -q -r app scripts

migrate:
	cd backend && uv run alembic upgrade head

openapi:
	cd frontend && pnpm api:generate
