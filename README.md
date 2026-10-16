# BookLoop

A marketplace for buying and selling used books. ("BookLoop" is a placeholder name, set in `frontend/lib/constants.ts`.)

## Repository layout

```
.
├── docs/
│   ├── ROADMAP.md     # ordered list of PRs, slice by slice
│   ├── backend.md     # backend domain, architecture, security, modules M0–M13
│   └── frontend.md    # design system, responsive rules, modules F0–F13
└── frontend/          # Next.js app (App Router, TypeScript, Tailwind)
    └── app/           # routes: Next.js requires this folder name; each subfolder is a URL segment
```

The FastAPI backend arrives later in slice S0 as `backend/` (see `docs/ROADMAP.md`).

## Requirements

- Node.js ≥ 20.9
- pnpm 10 (`corepack enable` picks the version pinned in `frontend/package.json`)

## Run the web app

```bash
cd frontend
pnpm install
pnpm dev      # http://localhost:3000
```

Production build (also runs the TypeScript check):

```bash
pnpm build && pnpm start
```

## Environment variables

Each app documents its variables in its own committed `.env.example` (e.g. `frontend/.env.example`). Copy it to `.env.local` in the same folder and fill in real values. Real `.env*` files are gitignored and must never be committed.

## Contributing

One branch per PR (`feat/s<n>-<nn>-<short-name>`), Conventional Commits, PRs into `main` using `.github/pull_request_template.md`. Never commit directly to `main`.
