# PROGRESS

## Current: S0-00 — Docs and ignore rules
Step: awaiting UNDERSTOOD
Status: in-progress (committed locally; push + PR waiting on remote decision, see Open questions)

## PR tracker
| PR-ID | Title | Branch | PR URL | Merged | UNDERSTOOD |
|---|---|---|---|---|---|
| S0-00 | Docs and ignore rules | feat/s0-00-docs | pending (not pushed) | no | no |

## Today (2026-10-15)
Commits 2/2-3 · files in PR 6/12 · PR pending

## Slice checklist (S0)
- [ ] S0-00 Docs and ignore rules
- [ ] S0-01 … S0-26 (see ROADMAP.md)

## Approved slices
None yet.

## Daily log
- 2026-10-15: S0-00. `git init` (default branch `main`, repo-local author Captain-Saad), branch `feat/s0-00-docs`. Commit 1: root `.gitignore` (`/learn/`, `.env*` with `!.env.example`, `node_modules/`, `.next/`, `__pycache__/`, `.venv/`), verified with `git check-ignore`. Commit 2: the five docs. Teach note `learn/S0-00/teach.md` + `learn/INDEX.md` written (gitignored). `gh` CLI is not installed; push/PR waiting on the remote decision.
- 2026-10-14: Project restarted. Docs prepared (`CLAUDE.md`, `ROADMAP.md`, `backend.md`, `frontend.md`). New rules: ≤ 12 files per PR, one PR per day, teach note per PR in gitignored `learn/`, `UNDERSTOOD` gate. No code yet.

## Decisions
- 2026-10-15: `.gitignore` re-includes `.env.example` (`!.env.example`) because `.env*` alone would also hide the example files CLAUDE.md §7 requires us to commit.
- 2026-10-15: S0-00 is ~900 lines, above the ~300-line guide. Accepted: it is the docs-only PR that ROADMAP mandates, and the limit is for hand-written code.
- 2026-10-15: Where `backend.md`/`frontend.md` §0 differ from CLAUDE.md (branch names `feat/m<n>-…`, BE-before-FE module order, 400-line PR size), CLAUDE.md wins, per its §1.
- 2026-10-12: Stack fixed (Next.js, FastAPI, Supabase Postgres, SQLAlchemy 2.0 async + Alembic, Stripe Connect, Redis + ARQ).
- 2026-10-12: Vertical slices, frontend first with MSW mocks, then backend to the same contract, then wire.
- 2026-10-14: PRs capped at 12 files / ~300 lines; each PR gets `learn/<ID>/teach.md` (gitignored) and an `UNDERSTOOD` gate.

## Contract changes
None yet.

## Open questions
- **(blocking push/PR)** Remote: `git@github.com:Captain-Saad/BookResaleMarket.git` still holds the pre-restart history (`main`, `release`, `feat/s1-auth`, PRs #1 and #2). Choose: new empty GitHub repo, or reuse this repo (and what happens to its old `main`).
- **(blocking PR)** `gh` CLI is not installed. Install + `gh auth login`, or the user opens PRs from the compare URL.
- **(blocking PR)** The local repo has no `main` commit yet, so a PR needs a base. Proposed: one empty root commit on `main` (`chore: initial empty commit`), with `feat/s0-00-docs` rebased onto it before its first push.
- Tax treatment (merchant of record vs facilitator): decide with the team lead before S4-06.

## Known gaps / tech debt
None yet.

## How to run & test right now
Nothing runs yet. Check the ignore rules: `git check-ignore -v learn/` (prints the `/learn/` rule). After S0-01: `cd apps/web && pnpm dev`, then open http://localhost:3000.
