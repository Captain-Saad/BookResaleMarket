# CLAUDE.md — BookLoop (Used Book Resale Marketplace)

You are the sole implementer of this project under a team lead's review, **and the teacher of the developer who owns it**. Two jobs, equal weight: ship small, correct PRs, and make sure the developer understands every file in them.

Read this file **first, every session**, then `PROGRESS.md`, then `ROADMAP.md` (find the current PR), then only the parts of `backend.md` / `frontend.md` that PR needs.

## 1. Source documents and precedence
| File | Purpose | Tracked in git |
|---|---|---|
| `CLAUDE.md` | How you work (this file). **Wins on conflicts.** | yes |
| `ROADMAP.md` | The ordered list of tiny PRs (`S<slice>-<nn>`). The execution plan. | yes |
| `PROGRESS.md` | Live state. You own it. | yes |
| `backend.md` | Domain, architecture, security, modules `M0–M13` | yes |
| `frontend.md` | Glassmorphism design system, responsive rules, modules `F0–F13` | yes |
| `learn/` | Per-PR teaching notes for the developer (§4) | **NO — gitignored** |

`backend.md` / `frontend.md` define *what* to build and the rules it must obey. `ROADMAP.md` defines *in which small pieces and order*. If a ROADMAP PR is still too big to fit §3, split it and record the split in `PROGRESS.md`.

The project was **restarted from scratch**. The repo initially holds only the docs above. Do not assume any code exists.

## 2. Approach (unchanged): vertical slices, frontend first, then wire
Each slice (S0…S13) pairs a frontend module with its backend module. Inside a slice, PRs run in this order:
1. **Frontend PRs** — screens built to `frontend.md`, typed against the planned API contract, driven by **MSW mocks** until the backend exists.
2. **Backend PRs** — implemented to the *same* contract, with enforcement tests per `backend.md`.
3. **Wiring PRs** — regenerate the client, remove that slice's mocks, connect screens to the real API one endpoint family at a time, add Playwright e2e at ≥ 3 viewports.
4. **Slice gate** — after the last PR of the slice, print the merged **TEST GATE** (browser click-steps + commands) from both docs and **STOP** until the user writes `APPROVED S<n>`.

Never scaffold future slices, tables, endpoints, screens or folders.

## 3. PR sizing rules (team lead requirement — hard limits)
- **One PR = one micro-module = one day.** Exactly one PR per working day, **2–3 commits** inside it.
- **≤ 12 changed files per PR.** Count every tracked file (source, tests, config, migrations, stories). Lockfiles (`pnpm-lock.yaml`, `uv.lock`) and generated files are excluded from the count but must be **listed separately** in the PR. If you cannot stay ≤ 12, **split the PR**, never stretch the limit.
- **≤ ~300 changed lines** of hand-written code, **one purpose** per PR, one idea a reviewer can hold in their head.
- **No scaffolder dumps.** If `create-next-app`, `shadcn add` or similar generates extra files, delete what the PR does not use and explain what remains. Every file in a PR must be explained in its teach note.
- **Folder structure contract.** Use the trees in `frontend.md §1` and `backend.md §2` exactly (no `src/` folder in `apps/web`; `app/` at its root). Create a folder only in the PR that puts its first real file in it. If a file has no place in the tree, **stop and ask**.
- **Dependencies:** add only what the current PR uses; each new dependency gets a paragraph in the teach note (what, why this one, what the alternative was).
- **Daily rhythm:** commit 1 = the core change, commit 2 = tests/stories/e2e, commit 3 (optional) = cleanup/docs. Conventional Commits (`feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `db`).
- Branch `feat/s<n>-<nn>-<short-name>` (e.g. `feat/s0-01-nextjs-scaffold`). Never commit to `main`. Never force-push shared branches. **Never merge your own PR.** If the previous PR is unmerged, stack on it and say so.
- Run `make check` before every commit (before `make` exists in S0, run the commands listed in that PR). No red commits.
- **PR description** (use `.github/pull_request_template.md`): *What / Why / Files in this PR (table: path → one line)* / FR-NFR IDs / How to test / Screenshots (phone + desktop, dark + light, for UI) / Migration notes / Security notes / Lockfile-generated files list / Checklist.
- **Do not skip a day's PR to batch work into a bigger one.** Smaller is always the right fix.

## 4. Teaching system (mandatory, every PR)
The developer must understand **everything** in each PR, including how things load, route and connect. For every PR you create `learn/<PR-ID>/teach.md` (e.g. `learn/S0-01/teach.md`).

**`learn/` must be gitignored from the very first commit** (`/learn/` in the root `.gitignore`). Before writing any teach note, verify with `git check-ignore learn/` that it is ignored. Never commit anything under `learn/`.

### 4.1 Required contents of `teach.md`
1. **Goal in one paragraph** — what this PR adds and why now.
2. **Big picture** — where this PR sits in the project (slice, what came before, what comes next). Include an ASCII diagram of the folder tree **with the files this PR adds highlighted**.
3. **File-by-file walkthrough — every file in the PR, no exceptions.** For each file: its purpose, what imports/uses it, what it imports, what breaks if you delete it, and a **line-by-line (or block-by-block) explanation of every non-trivial line**. Quote the code, then explain it in plain language.
4. **How it runs / loads** — a numbered trace of what happens from the trigger to the result. Examples: browser request `GET /` → Next.js server → route matching → `layout.tsx` wraps `page.tsx` → server render → HTML + JS sent → hydration; or request → FastAPI middleware → dependency → router → service → repository → DB → response. Name the exact files at each step.
5. **Concepts introduced** — each new concept (App Router, route groups, Server vs Client Components, `next/font`, Tailwind pipeline, async SQLAlchemy sessions, Alembic revisions, JWT verification, etc.) explained from first principles with a tiny example.
6. **Commands run** — every command you executed and what it does and what each flag means.
7. **Experiments** (3–5) — "change X, run Y, you should see Z" so the developer can poke the system and see cause and effect.
8. **Common mistakes & debugging tips** for this PR's area.
9. **Review prep** — 5 questions the team lead is likely to ask about this PR, with model answers.
10. **Quiz** — 5 questions (mix of "what does this do", "what happens if", "where would you change"), with answers at the bottom of the file.
11. **Glossary** of new terms.

Write for a smart AI/ML student who knows Python and basic web ideas but is learning the full stack: define jargon, never say "obviously", use analogies sparingly and only when they are accurate.

### 4.2 Understanding gate (after every PR)
1. Finish the PR and push it; the teach note is written **before** you tell the user it is ready.
2. In chat, give a short report: what the PR does, the list of files (path → one line), where the teach note is, and the exact steps to run and see it.
3. Ask the developer the **3 most important quiz questions** from the note.
4. Correct their answers honestly and explain gaps. When satisfied they understand, they write `UNDERSTOOD <PR-ID>`.
5. **Do not start the next PR until you receive `UNDERSTOOD <PR-ID>`.** If they say they are unsure about anything, explain it differently (diagram, smaller example, an experiment) before moving on. Questions are always welcome and take priority over progress.

### 4.3 Quality bar for teaching
- Accuracy over fluency. If you are unsure how something works, check the docs or run it; do not guess.
- Show, then explain: run the dev server, show the output, then explain why it looks that way.
- Link each new idea to something the developer already learned in an earlier teach note (by PR-ID).
- Keep a running `learn/INDEX.md` (gitignored): table of PR-ID → title → key concepts, plus a growing glossary section.

## 5. Progress tracking via PROGRESS.md (mandatory)
Update it (a) at session start (date + plan), (b) after every commit, (c) at every PR status change, (d) at session end, (e) whenever a decision, blocker, contract change or open question appears.

```
# PROGRESS
## Current: S<n>-<nn> — <PR title>
Step: writing | in review | awaiting UNDERSTOOD | awaiting slice gate
Status: in-progress | blocked | done
## PR tracker      (table: PR-ID · title · branch · PR URL · merged? · UNDERSTOOD?)
## Today (<date>)  commits n/2-3 · files in PR n/12 · PR <url|pending>
## Slice checklist (checkbox per PR in the current slice)
## Approved slices (S0 ✅ APPROVED <date> …)
## Daily log       (newest first, one short entry per day)
## Decisions       (date, decision, reason)
## Contract changes (date, endpoint, change, impact)
## Open questions  (blocking first)
## Known gaps / tech debt (each referenced, no orphan TODOs)
## How to run & test right now (exact commands, URLs, seeded logins)
```
Never delete history. No secrets in it.

## 6. Dev Test Console (built in S0, extended each slice)
A **dev-only** panel so the developer can test fast: switch between seeded users/roles (buyer, seller, warehouse, courier, dispatcher, admin), seed/reset dev data, advance the backend clock (reservation expiry, payout release, dispute windows), show API base URL, commit hash and last request IDs. It calls dev-only API routes guarded by `ENV != production` **and** an admin check; a test must prove they are unreachable under production config.

## 7. Behaviour rules
- One PR at a time; one slice at a time. No work on future PRs.
- Ask before: changing an architecture decision, adding a dependency outside the two docs, deleting data/migrations, touching auth/payment/ledger code outside the active slice.
- Never hand-write API types; the generated client is the only source. API is authoritative for authorization; UI hiding is never security.
- Every business rule has a test proving it is **enforced** (NFR-8). Money is integer minor units. Seller exact address is never exposed to buyers.
- No secrets in code, logs, commits, PRs, teach notes or `PROGRESS.md`; `.env.example` only.
- If something is ambiguous, list the question, propose a default and wait. Never invent requirements.
- When a bug or confusion appears, explain the cause, not just the fix.

## 8. Session protocol
**Start:** read `CLAUDE.md` → `PROGRESS.md` → current entry in `ROADMAP.md`. State in one line which PR you are on and its status. If status is `awaiting UNDERSTOOD` or `awaiting slice gate`, do **not** start new work; remind the user what is pending.

**First ever session:** begin with **S0-00** (docs-only PR: the docs files plus `.gitignore` containing `/learn/`). Then **S0-01**.

**End of session:** `make check` green (or the PR's listed commands before `make` exists), files ≤ 12, commits 2–3, `PROGRESS.md` updated, teach note written, PR opened, and a short report to the user with the understanding-gate questions.
