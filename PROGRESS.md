# PROGRESS

## Current: S0-00 — Docs and ignore rules
Step: awaiting UNDERSTOOD
Status: in-progress (pushed; user opens PR from compare URL)

## PR tracker
| PR-ID | Title | Branch | PR URL | Merged | UNDERSTOOD |
|---|---|---|---|---|---|
| S0-00 | Docs and ignore rules | feat/s0-00-docs | pending (user opens from https://github.com/Captain-Saad/BookResaleMarket/compare/main...feat/s0-00-docs) | no | no |

## Today (2026-10-15)
Commits 3/2-3 · files in PR 6/12 · PR pending (compare URL ready)

## Slice checklist (S0)
- [ ] S0-00 Docs and ignore rules
- [ ] S0-01 … S0-26 (see ROADMAP.md)

## Approved slices
None yet.

## Daily log
- 2026-10-15: S0-00. `git init` (default branch `main`, repo-local author Captain-Saad), branch `feat/s0-00-docs`. Commit 1: root `.gitignore` (`/learn/`, `.env*` with `!.env.example`, `node_modules/`, `.next/`, `__pycache__/`, `.venv/`), verified with `git check-ignore`. Commit 2: the five docs. Teach note `learn/S0-00/teach.md` + `learn/INDEX.md` written (gitignored). `gh` CLI is not installed. Old remote wiped on user's request: `main` replaced by one empty root commit, old branches `release` and `feat/s1-auth` deleted. Branch rebased onto the new `main` and pushed; commit 3 updates this file.
- 2026-10-14: Project restarted. Docs prepared (`CLAUDE.md`, `ROADMAP.md`, `backend.md`, `frontend.md`). New rules: ≤ 12 files per PR, one PR per day, teach note per PR in gitignored `learn/`, `UNDERSTOOD` gate. No code yet.

## Decisions
- 2026-10-15: Reuse remote `git@github.com:Captain-Saad/BookResaleMarket.git`, wiping all pre-restart branches (user's decision). `main` = one empty root commit `chore: initial empty commit`, the only direct commit to `main`; all work arrives via PRs. Old PRs #1/#2 stay as closed records (GitHub cannot delete PRs).
- 2026-10-15: All commits authored and committed by `Captain-Saad <bsai23011@itu.edu.pk>` (repo-local config), no Co-Authored-By or other trailers (user's decision).
- 2026-10-15: `.gitignore` re-includes `.env.example` (`!.env.example`) because `.env*` alone would also hide the example files CLAUDE.md §7 requires us to commit.
- 2026-10-15: S0-00 is ~900 lines, above the ~300-line guide. Accepted: it is the docs-only PR that ROADMAP mandates, and the limit is for hand-written code.
- 2026-10-15: Where `backend.md`/`frontend.md` §0 differ from CLAUDE.md (branch names `feat/m<n>-…`, BE-before-FE module order, 400-line PR size), CLAUDE.md wins, per its §1.
- 2026-10-12: Stack fixed (Next.js, FastAPI, Supabase Postgres, SQLAlchemy 2.0 async + Alembic, Stripe Connect, Redis + ARQ).
- 2026-10-12: Vertical slices, frontend first with MSW mocks, then backend to the same contract, then wire.
- 2026-10-14: PRs capped at 12 files / ~300 lines; each PR gets `learn/<ID>/teach.md` (gitignored) and an `UNDERSTOOD` gate.

## Contract changes
None yet.

## Open questions
- Tax treatment (merchant of record vs facilitator): decide with the team lead before S4-06.

## Known gaps / tech debt
None yet.

## How to run & test right now
Nothing runs yet. Check the ignore rules: `git check-ignore -v learn/` (prints the `/learn/` rule). After S0-01: `cd apps/web && pnpm dev`, then open http://localhost:3000.
