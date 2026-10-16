# frontend.md — Used Book Resale Marketplace (Next.js, elite glassmorphism)

> **Audience: Claude Code.** Read this file, then `backend.md` (§0 working rules apply **identically** here: module gate, `APPROVED F<n>`, 2–3 commits/day, one PR/day reviewed by the team lead, never merge your own PR, `make check` before every commit). Update `PROGRESS.md` every session. `BookLoop` is a placeholder name kept in one constant.

---

## 0. Frontend working rules
1. One frontend module (`F0…F13`) at a time. Finish → run all checks → print **TEST GATE** (§9) → **STOP** until the user writes `APPROVED F<n>`.
2. A frontend module may start only after its backend module is `APPROVED` (mapping in §9). Never mock a backend that already exists; use the generated client from `packages/api-client`.
3. **Never hand-write API types.** Regenerate from OpenAPI (`pnpm api:generate`). If the backend contract is wrong, stop and tell the user; do not work around it.
4. **Design system first.** No page may use raw hex colors, ad-hoc blur values or one-off spacing. Everything comes from tokens (§3). New component → Storybook story + a11y check in the same commit.
5. Every screen ships **responsive at all breakpoints (§5), with loading / empty / error / forbidden states, keyboard access, and reduced-motion/transparency fallbacks**.
6. Ask before adding a dependency not in §1.

---

## 1. Stack (fixed)
| Concern | Choice |
|---|---|
| Framework | **Next.js (latest stable, App Router)**, React Server Components by default, TypeScript `strict` + `noUncheckedIndexedAccess` |
| Styling | **Tailwind CSS** + CSS variables for tokens; no CSS-in-JS runtime |
| Primitives | **shadcn/ui on Radix** — heavily restyled into the glass system (never ship default look) |
| Motion | `motion` (Framer Motion) with a shared motion-preset file; CSS for micro-interactions |
| Data | Server Components fetch from FastAPI with the user's JWT; **TanStack Query** for client mutations/live data |
| Forms | react-hook-form + zod (schemas mirror OpenAPI constraints) |
| Auth | `@supabase/ssr` (HttpOnly cookies) — **auth only**; the browser never queries Supabase tables |
| Payments | Stripe Elements / Payment Element (no card data in our DOM) |
| i18n/region | `next-intl`; `Intl.NumberFormat`/`DateTimeFormat`; region config from API |
| Icons/Fonts | `lucide-react`; `next/font`: **Fraunces** (display serif, "book" feel) + **Geist/Inter** (UI) + Geist Mono (ISBN, tracking) |
| Quality | ESLint (strict, jsx-a11y), Prettier, `tsc`, Vitest + Testing Library, **Playwright** (multi-viewport + visual regression), `axe-core`, Storybook, Lighthouse CI |
| Monitoring | Sentry, Web Vitals reporting |

Structure:
```
frontend/
├─ app/
│  ├─ (public)/        # home, search, listing detail, legal
│  ├─ (auth)/          # login, register, verify, reset
│  ├─ (buyer)/         # checkout, orders, tracking, disputes
│  ├─ (seller)/sell/   # listing wizard, my listings, payouts
│  ├─ (warehouse)/warehouse/   # staff console
│  ├─ (courier)/courier/       # mobile-first PWA
│  ├─ (admin)/admin/           # ops & dispute console
│  ├─ api/                     # BFF route handlers only when needed
│  └─ layout.tsx, error.tsx, not-found.tsx, loading.tsx
├─ components/ui/       # glass primitives
├─ components/domain/   # BookCard, OrderTimeline, FeeBreakdown, StatusPill …
├─ lib/ (api, auth, money, region, motion, a11y)
├─ styles/ (tokens.css, glass.css, globals.css)
└─ tests/ (unit, e2e, visual)
```

---

## 2. Design vision — "Midnight Library, in glass"
A premium, calm, editorial marketplace: deep atmospheric backgrounds, frosted translucent surfaces floating over soft aurora light, serif headlines, crisp UI type. It must feel like a high-end product (Apple visionOS / Linear polish), **not** a template.

- **Mood:** quiet luxury, warm literary accents, high legibility.
- **Backdrop ("Aurora Stage"):** fixed full-viewport layer of 3 blurred gradient orbs (indigo, teal, amber) that drift very slowly (60–90 s loops, transform-only), plus a faint 2% noise texture and vignette. Pauses when tab hidden or `prefers-reduced-motion`.
- **Glass surfaces** float above the stage; content hierarchy is expressed by **glass tier**, not by heavy shadows.
- **Book imagery** is the hero: covers sit on glass shelves with soft reflections; condition grade shown as a refined badge, never a loud sticker.

---

## 3. Design tokens (single source: `styles/tokens.css`, mirrored in `tailwind.config`)

### 3.1 Color (dark default, light supported via `[data-theme]`; respects system, user-toggleable, no flash)
```css
:root[data-theme="dark"]{
  --bg-0:#070A12; --bg-1:#0B1020; --bg-2:#121A2E;
  --ink-1:#F4F6FB; --ink-2:#C5CBDD; --ink-3:#8E97B3;     /* text on glass */
  --brand:#7C8CFF; --brand-2:#5EEAD4; --accent:#F6B26B;   /* indigo / teal / amber */
  --success:#4ADE80; --warning:#FBBF24; --danger:#F87171; --info:#60A5FA;
  --glass-1: rgba(255,255,255,.06);  /* base panels */
  --glass-2: rgba(255,255,255,.10);  /* cards, nav */
  --glass-3: rgba(255,255,255,.16);  /* modals, popovers, hover */
  --glass-border: rgba(255,255,255,.18);
  --glass-highlight: rgba(255,255,255,.32);
  --scrim: rgba(7,10,18,.55);        /* opaque-ish layer behind text for contrast */
}
:root[data-theme="light"]{
  --bg-0:#EEF1F8; --bg-1:#E4E9F5; --ink-1:#0E1424; --ink-2:#38415C; --ink-3:#5B6584;
  --glass-1: rgba(255,255,255,.45); --glass-2: rgba(255,255,255,.62); --glass-3: rgba(255,255,255,.78);
  --glass-border: rgba(255,255,255,.7); --scrim: rgba(255,255,255,.55);
}
```
Condition grades have fixed semantic colors: New `--brand-2`, Like New `--success`, Very Good `--info`, Good `--accent`, Acceptable `--ink-3`.

### 3.2 Glass recipe (the *only* allowed implementation, `styles/glass.css`)
```css
.glass{
  background: linear-gradient(135deg, var(--glass-2), var(--glass-1));
  -webkit-backdrop-filter: blur(var(--blur,20px)) saturate(160%);
          backdrop-filter: blur(var(--blur,20px)) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius, 20px);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),      /* top rim light */
    inset 0 -1px 0 rgba(0,0,0,.15),
    0 10px 30px rgba(0,0,0,.28);
}
.glass--1{ --blur:12px } .glass--2{ --blur:20px } .glass--3{ --blur:28px }
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .glass{ background: var(--bg-2); }
}
@media (prefers-reduced-transparency: reduce){ .glass{ backdrop-filter:none; background:var(--bg-2); } }
@media (max-width: 640px){ .glass{ --blur: 12px } }              /* mobile perf */
```
Rules: **max 2 stacked blur layers** in any viewport region; never blur inside scrolling lists of >20 items (use `glass--flat`: translucent bg, no blur); put text on `--scrim` or ensure **WCAG AA (4.5:1) measured against the worst-case background**; never animate `backdrop-filter` or `blur` values (animate opacity/transform only); `will-change` only during transitions.

### 3.3 Other tokens
- **Radius:** 10 / 14 / 20 / 28 / pill. **Spacing:** 4-pt scale. **Elevation:** 3 shadows only.
- **Type scale (fluid `clamp`)**: display 40→72, h1 32→48, h2 24→32, h3 20→24, body 16, small 14, caption 12. Display/headings in Fraunces; UI in Geist; numerals tabular for money.
- **Motion:** durations 120/200/320/500 ms; easings `cubic-bezier(.2,.8,.2,1)` (out), spring `{stiffness:260,damping:26}`. All motion honors `prefers-reduced-motion` (fade only).
- **Focus ring:** 2 px `--brand` + 2 px offset, always visible, never removed.

---

## 4. Component library (build in F0/F1, extend later)
Primitives (glass-styled, accessible): `GlassCard, GlassPanel, GlassNav, GlassModal/Drawer/Sheet, Button (primary/secondary/ghost/danger, loading), IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider (price range), Tabs, Tooltip, Toast, Skeleton, Badge, Avatar, Stepper, Table (dense + card-collapse on mobile), Pagination (cursor), EmptyState, ErrorState, ConfirmDialog, FileDropzone, Timeline`.
Domain: `BookCard, BookCover (with fallback), ConditionBadge, FulfillmentBadge (Warehouse/On-Demand), PriceTag, FeeBreakdown (itemized: item / buyer fee / tax lines / delivery / total), RegionNotice (US/EU disclosures), OrderTimeline (shared by both fulfillment models; model-specific steps injected), StatusPill, TrackingMap/Steps, RatingStars, ListingWizard steps, PayoutLedgerTable, DisputeThread, WithdrawalNotice (EU)`.
Every component: Storybook stories for all states + dark/light + 3 viewports, unit tests, axe passing.

---

## 5. Responsiveness (leave nothing out)
Mobile-first. Breakpoints: `xs 360` · `sm 480` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536` · `3xl 1920+` (content max-width 1440, centered). Test viewports in Playwright: **360×640, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080**, plus landscape phone.

| Area | xs–sm (phone) | md (tablet) | lg+ (desktop) |
|---|---|---|---|
| Nav | bottom tab bar (Browse, Sell, Orders, Account) + top glass bar with search icon | top bar + collapsible side drawer | full top bar, mega search, account menu |
| Search | filters in full-height bottom sheet; 2-col card grid (1-col < 380) | 3-col grid + slide-over filters | 4–5 col grid + persistent left filter rail |
| Listing detail | stacked: gallery swipe → sticky bottom purchase bar | 2-col | 2-col with sticky purchase glass card |
| Checkout | single column stepper; sticky total bar | 2-col summary | 2-col with persistent order summary |
| Seller wizard | one step per screen, autosave drafts | side stepper | side stepper + live preview card |
| Tables (orders, payouts, admin) | collapse into labeled cards | scrollable table | full dense table, column picker |
| Warehouse console | tablet-first (barcode/scan input always focused, large targets) | primary target | multi-pane queues |
| Courier app | **primary target: phone**, PWA-installable, one-handed use, large buttons (≥ 48 px), offline-tolerant task list | works | works |
| Admin | read-only fallbacks, critical actions confirm | usable | primary target, keyboard shortcuts |

Rules: touch targets ≥ 44×44; no horizontal page scroll at any width; support safe-area insets (`env(safe-area-inset-*)`); `dvh` units not `vh`; text scales to 200% zoom without loss; container queries for cards; images via `next/image` with `sizes`, AVIF/WebP, blur placeholders, fixed aspect ratios (no CLS); support RTL-safe logical properties (`ms-`, `pe-`) for future locales; hover-only interactions must have tap/keyboard equivalents.

---

## 6. UX & screen inventory (by role)
**Public/Buyer:** Home (hero search, featured shelves, how-it-works), Search & filter (FR-7), Listing detail (FR-8: price, grade, notes, photos, fulfillment badge, delivery window, city/region only), Auth screens, Checkout (itemized fee/tax, region disclosures, EU withdrawal notice FR-31, Stripe Payment Element), Order confirmation, My Orders, Order detail + live tracking (FR-19), Confirm receipt, Open dispute (FR-26), EU withdrawal request, Rate seller (FR-36), Notifications, Profile/addresses, Data export/erasure (NFR-2).
**Seller:** Become-a-seller + identity verification (FR-34), Listing wizard (ISBN lookup → condition & notes → photos → fulfillment choice with clear comparison → price → review), My listings (status chips: incoming/active/reserved/sold), Inbound label & shipment tracking (warehouse), Pickup status (on-demand), Payout ledger (FR-24: pending/released/history), Ratings.
**Warehouse staff:** Inbound queue (FR-10), Intake inspection form (pass / mismatch / damaged / not received, photos), Storage location assign + "where is book X" lookup (FR-12), Pick/pack queue, Ship with tracking (FR-14).
**Courier:** Task list, Task detail (address, navigation deep link), Pickup completion with **condition-confirm step** (match / does not match + photo) (FR-16), Delivery completion.
**Dispatcher/Admin:** Dispatch board (assign, route direct vs hub), Users (suspend), Orders, Listings, Disputes (resolve with fixed outcomes), Payouts (hold), Refunds, Reports, Audit log.
**System states:** 404, 403, 429, offline banner, maintenance, session-expired modal.

UX principles: money is always itemized and never surprising; every destructive/irreversible action (pay, dispute, refund, suspend, release) has a confirm step with a plain-language consequence; status always shown with the shared `OrderTimeline`; optimistic UI only for non-financial actions; skeletons mirror final layout.

---

## 7. Security (frontend)
- Tokens only in **HttpOnly, Secure, SameSite=Lax cookies** (`@supabase/ssr`). Never `localStorage`.
- Strict **CSP with nonces** (script/style/img/frame/connect allowlist incl. Stripe, Supabase, API origin), `X-Frame-Options/frame-ancestors none`, `Referrer-Policy`, `Permissions-Policy`, HSTS, `nosniff` — configured in `next.config` + middleware.
- `middleware.ts` guards route groups by role **for UX only**; the API is authoritative. Never hide a button as a security measure.
- Only `NEXT_PUBLIC_*` vars reach the browser; secrets stay server-side; lint rule blocks importing server modules into client components (`server-only`).
- Sanitize any rich text (DOMPurify) — prefer plain text for notes. Never `dangerouslySetInnerHTML` without review.
- File uploads: client validates type/size/dimensions, strips nothing trusted (server re-validates); use signed upload URLs.
- Stripe Elements iframes only; no card fields of our own. Disable autofill logging of sensitive fields.
- Idempotency keys generated per checkout attempt; disable submit while pending; handle double-click/back-button.
- Rate-limit UX: show `429` with retry countdown. Redirect validation on `next=` params (no open redirects).
- Dependency audit (`pnpm audit`), Dependabot, gitleaks in CI. Third-party scripts: none beyond Stripe/Sentry.

## 8. Accessibility, performance, quality gates
- **WCAG 2.2 AA**: semantic landmarks, labeled controls, focus management in modals/sheets, `aria-live` for toasts and status changes, skip link, color never the only signal, glass contrast verified (automated + manual). Screen-reader pass on checkout and listing wizard.
- **Performance budgets (mobile, 4G):** LCP < 2.5 s, INP < 200 ms, CLS < 0.05, route JS < 180 KB gz for public pages. Lighthouse CI fails PR under Perf 90 / A11y 95 / Best-Practices 95 / SEO 95 (public pages).
- Blur is GPU-costly: test on a throttled mid-range Android profile; if frame rate drops, lower tier blur (token change, not component change).
- SEO: metadata API, OpenGraph, JSON-LD `Book`/`Offer` on listing pages, sitemap, canonical URLs, robots; **no precise seller location in markup**.
- Tests per module: component tests, Playwright e2e of the module's golden path **at ≥ 3 viewports**, visual-regression snapshots (dark + light), axe scan on every new route.
- Error handling: global `error.tsx`, per-route boundaries, typed API error → user-friendly message map by backend `code`; never show raw errors.

---

## 9. Frontend modules (run after the matching backend module is APPROVED)

| FE | After BE | Scope | TEST GATE (user checks) |
|---|---|---|---|
| **F0** Foundation & design system | M0 | Next.js app, Tailwind, tokens, glass CSS, Aurora Stage, fonts, theme toggle, Storybook, primitives (§4 primitives), layout shells, generated API client, CI (lint/type/test/lighthouse/axe/playwright) | Storybook shows all primitives dark/light; resize 360→1920 no overflow; reduced-motion & reduced-transparency fallbacks work; Lighthouse passes |
| **F1** Auth & account shell | M1 | Login/register/reset, session cookies, route-group guards, account/profile/addresses, role-aware nav, seller verification flow UI, suspended-account screen | Register/login/logout; suspended user sees the blocked screen; mobile bottom-nav works; no token in localStorage |
| **F2** Seller listing wizard | M2 | ISBN lookup UI, wizard (autosave), photo upload with previews, fulfillment comparison step, My Listings, immutable-field UI states | Create warehouse + on-demand listings on phone & desktop; locked fields shown disabled with explanation |
| **F3** Search & listing detail | M3 | Home, search, filters (sheet/rail), BookCard grid, detail page, SEO, skeletons, real-time availability handling | All filters work at each breakpoint; reserved/sold vanish; Lighthouse ≥ budgets |
| **F4** Fees & checkout quote UI | M4–M5 | Address picker, `FeeBreakdown`, `RegionNotice` (US vs EU), quote refresh states | Quote to US vs EU address shows correct currency/tax/disclosures |
| **F5** Checkout & payment | M6–M7 | Reservation countdown, Stripe Payment Element, 3DS, success/failure/expired states, order confirmation, idempotent submit | Test cards (success/3DS/decline); double-click safe; expired reservation UX |
| **F6** Warehouse console | M8 | Inbound queue, inspection form, locate book, pick/pack, ship; seller inbound-label & tracking UI | Run full warehouse flow on tablet viewport with keyboard/scanner input |
| **F7** Courier PWA & dispatch board | M9 | Courier task list/detail/pickup-confirm/delivery, installable PWA, offline-tolerant list; dispatcher board; buyer/seller tracking UI | Full pickup→delivery on a real phone; `no_match` path; address privacy verified |
| **F8** Orders, disputes & EU withdrawal | M10 | My orders/detail, timeline, confirm receipt, dispute thread, withdrawal UI, admin dispute resolution | Open + resolve disputes; EU shows withdrawal, US doesn't |
| **F9** Payouts & seller finance | M11 | Payout ledger, statuses, tax-info forms, admin payout/hold views | Ledger matches API; blocked/released states clear |
| **F10** Ratings, notifications, admin console | M12 | Rating UI, notification center (bell + page), admin tables (orders/listings/users), suspend UX | Rate after completion; notifications live; admin suspend works |
| **F11** Privacy & compliance UI | M13 | Cookie/consent (only if non-essential cookies exist), data export/erasure screens, legal pages, EU consumer notices | Export & erase flows work end-to-end |
| **F12** Polish: motion, empty/error states, i18n scaffolding | M13 | Motion presets everywhere, microinteractions, skeleton parity, locale scaffolding, offline/maintenance pages | Walkthrough of every role with no jank at 60 fps on throttled mobile |
| **F13** Release hardening | M13 | Full a11y audit, visual-regression baselines, Lighthouse budgets, bundle analysis, Sentry sourcemaps, final cross-browser pass (Safari iOS, Chrome Android, Firefox, Edge) | All gates green; sign-off checklist printed |

Each FE module: **Commit plan** (min 2/day): (1) components + stories, (2) page/route + data wiring, (3) tests + a11y/visual fixes. One PR/day with before/after screenshots at phone + desktop (dark & light).

## 10. Definition of done (every FE module)
- [ ] `make check` green (eslint, tsc, vitest, playwright @ ≥3 viewports, axe, lighthouse)
- [ ] All states: loading/empty/error/forbidden/offline
- [ ] Tokens only; glass recipe unmodified; ≤ 2 stacked blur layers; contrast verified
- [ ] Keyboard + screen-reader path works; reduced motion/transparency honored
- [ ] No secrets/tokens in client bundle; CSP not violated (console clean)
- [ ] Generated API client up to date; no hand-typed API shapes
- [ ] Storybook updated; `PROGRESS.md` updated; TEST GATE printed and **stopped**

## 11. Start instruction
Wait for `APPROVED M0`, then begin **F0 only**. Do not start any other frontend module until the previous is approved and its backend counterpart is approved.
