# BookLoop

A marketplace for buying and selling used books. ("BookLoop" is a placeholder name.)

## Repository layout

```
.
├── CLAUDE.md      # how work is done (PR size, teaching gate); wins on conflicts
├── ROADMAP.md     # ordered list of small PRs (S0-00 … S13-08)
├── PROGRESS.md    # live project state: current PR, decisions, open questions
├── backend.md     # backend domain, architecture, security, modules M0–M13
├── frontend.md    # design system, responsive rules, modules F0–F13
└── apps/
    └── web/       # Next.js frontend (App Router, TypeScript, Tailwind)
```

The FastAPI backend (`apps/api`) arrives in S0-16.

## Requirements

- Node.js ≥ 20.9
- pnpm 10 (`corepack enable` picks the version pinned in `apps/web/package.json`)

## Run the web app

```bash
cd apps/web
pnpm install
pnpm dev      # http://localhost:3000
```

Production build (also runs the TypeScript check):

```bash
pnpm build && pnpm start
```

## Environment variables

Each app documents its variables in a committed `.env.example`. Copy it to `.env.local` and fill in real values. Real `.env*` files are gitignored and must never be committed.

## Contributing

Branch per PR (`feat/s<n>-<nn>-<short-name>`), Conventional Commits, PRs into `main` using `.github/pull_request_template.md`. Never commit directly to `main`. See `CLAUDE.md` §3.
