# BookLoop

A marketplace for buying and selling used books. ("BookLoop" is a placeholder name, set in `apps/web/lib/constants.ts`.)

## Repository layout

```
.
├── docs/
│   ├── ROADMAP.md     # ordered list of PRs, slice by slice
│   ├── backend.md     # backend domain, architecture, security, modules M0–M13
│   └── frontend.md    # design system, responsive rules, modules F0–F13
└── apps/
    └── web/           # Next.js frontend (App Router, TypeScript, Tailwind)
```

The FastAPI backend (`apps/api`) arrives later in slice S0 (see `docs/ROADMAP.md`).

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

Each app documents its variables in its own committed `.env.example` (e.g. `apps/web/.env.example`). Copy it to `.env.local` in the same folder and fill in real values. Real `.env*` files are gitignored and must never be committed.

## Contributing

One branch per PR (`feat/s<n>-<nn>-<short-name>`), Conventional Commits, PRs into `main` using `.github/pull_request_template.md`. Never commit directly to `main`.
