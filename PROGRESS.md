# PROGRESS

## Current: S0-01 — Repo hygiene + Next.js scaffold + minimal landing page
Step: writing
Status: in-progress (stacked on S0-00 / PR #1, which is not merged yet)

## PR tracker
| PR-ID | Title | Branch | PR URL | Merged | UNDERSTOOD |
|---|---|---|---|---|---|
| S0-00 | Docs and ignore rules | feat/s0-00-docs | https://github.com/Captain-Saad/BookResaleMarket/pull/1 | no | yes (2026-10-15) |
| S0-01 | Repo hygiene + Next.js scaffold + minimal landing page | feat/s0-01-nextjs-scaffold | pending | no | no |

## Today (2026-10-15)
S0-01: commits 1/2-3 · files in PR 10/12 · PR pending
(S0-00 earlier today: 3 commits, 6 files, PR #1.)

## Slice checklist (S0)
- [x] S0-00 Docs and ignore rules (PR #1, in review)
- [ ] S0-01 Repo hygiene + Next.js scaffold + minimal landing page
- [ ] S0-02 … S0-26 (see ROADMAP.md)

## Approved slices
None yet.

## Daily log
- 2026-10-15 (S0-01): Branch `feat/s0-01-nextjs-scaffold` from `feat/s0-00-docs` (stacked; PR targets `main`). Commit 1: hand-written Next.js 16.4.1 app in `apps/web` (no `create-next-app` dump), Tailwind v4 via PostCSS, root `.gitignore` gains `*.tsbuildinfo` + `next-env.d.ts`. Verified with `pnpm build` (types OK, `/` static) and `pnpm dev` + `curl /` (200, title "BookLoop", no `X-Powered-By`).
- 2026-10-15 (S0-00 follow-up): Correction to the entry below: the force-push to the old `main` was blocked by its ruleset, so the user deleted the GitHub repo and recreated it empty. `main` (empty root commit) and `feat/s0-00-docs` were pushed to the new repo; PR #1 opened by the user. Old PRs and history are gone. `UNDERSTOOD S0-00` received.
- 2026-10-15: S0-00. `git init` (default branch `main`, repo-local author Captain-Saad), branch `feat/s0-00-docs`. Commit 1: root `.gitignore` (`/learn/`, `.env*` with `!.env.example`, `node_modules/`, `.next/`, `__pycache__/`, `.venv/`), verified with `git check-ignore`. Commit 2: the five docs. Teach note `learn/S0-00/teach.md` + `learn/INDEX.md` written (gitignored). `gh` CLI is not installed. Old remote wiped on user's request: `main` replaced by one empty root commit, old branches `release` and `feat/s1-auth` deleted. Branch rebased onto the new `main` and pushed; commit 3 updates this file.
- 2026-10-14: Project restarted. Docs prepared (`CLAUDE.md`, `ROADMAP.md`, `backend.md`, `frontend.md`). New rules: ≤ 12 files per PR, one PR per day, teach note per PR in gitignored `learn/`, `UNDERSTOOD` gate. No code yet.

## Decisions
- 2026-10-15: Two PRs on 2026-10-15 (S0-00 docs-only + S0-01), at the user's request.
- 2026-10-15: S0-01 is stacked on `feat/s0-00-docs` and targets `main` (user's choice); its diff includes S0-00's commits until PR #1 merges.
- 2026-10-15: Global stylesheet at `apps/web/styles/globals.css` (the `frontend.md` §1 tree), not `app/globals.css` as ROADMAP lists; CLAUDE.md §3 makes the tree the folder contract. Imported as `@/styles/globals.css`.
- 2026-10-15: TypeScript pinned to 5.9.3, not 7.x: Next.js 16's own starter uses `^5`, and TS 7 is the new native compiler.
- 2026-10-15: `agentRules: false` in `next.config.ts`: stops `next dev` generating `apps/web/AGENTS.md`; project agent rules live in `CLAUDE.md`.
- 2026-10-15: `allowJs: true` in tsconfig is kept: Next.js adds it automatically on build.
- 2026-10-15: `apps/web` is a standalone pnpm project (lockfile `apps/web/pnpm-lock.yaml`) until a second package needs a workspace (`packages/api-client`, S0-23).
- 2026-10-15: Dependencies pinned to exact versions (`pnpm add -E`) so builds are reproducible.
- 2026-10-15: Supersedes the "Reuse remote" decision below: the GitHub repo was deleted and recreated empty (user's decision) because the old `main` ruleset blocked force-push. No old PRs remain.
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
- S0-01: "BookLoop" is hard-coded in `app/layout.tsx` and `app/page.tsx`; `backend.md`/`frontend.md` require one name constant. Move it into `lib/` in S0-02 (S0-01 was at the 12-file limit).

## How to run & test right now
```bash
cd apps/web
pnpm install          # first time only
pnpm dev              # http://localhost:3000 → "BookLoop" page
pnpm build            # production build + TypeScript check
```
Check the ignore rules: `git check-ignore -v learn/` (prints the `/learn/` rule).
