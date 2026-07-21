# ClassConnect · 班級連

A parent–teacher communication platform for lower-grade elementary classes — a **parent app** and a
**teacher app** rendered from one codebase by role. This repo upgrades the interactive demo
(`demo/index.html`) into a production app with **1:1 visual parity** and privacy enforced by
Postgres **RLS**.

> **Read the rules first:** [`AGENTS.md`](./AGENTS.md) → [`DEVELOPMENT.md`](./DEVELOPMENT.md) →
> [`docs/product/SPEC.md`](./docs/product/SPEC.md) → [`docs/design/DESIGN.md`](./docs/design/DESIGN.md)
> → [`demo/index.html`](./demo/index.html).

## Stack

React 18 + TypeScript · Vite · React Router v6 · TanStack Query v5 · Supabase (Postgres + Auth +
Storage + Realtime + Edge Functions) · native CSS ported from the demo · PWA (vite-plugin-pwa).

## Repository layout

```
src/
  app/        router, AuthProvider, RoleGate
  lib/        supabase client, queryKeys, realtime helpers
  services/   the ONLY seam that talks to Supabase (interface contracts, DEVELOPMENT.md §8)
  hooks/      TanStack Query wrappers around services
  features/   parent/ · teacher/ · shared/  (feature-sliced screens)
  ui/         design-system components ported from the demo (tokens.css + primitives)
  types/      db.ts (generated) · domain.ts (hand-written)
  styles/     global.css (component styles ported from the demo)
supabase/
  migrations/ versioned schema + RLS (0001_init.sql)
  functions/  Edge Functions (redeem_invite, send_push)
  config.toml local stack config · seed.sql
tests/
  unit/ · rls/ (cross-parent isolation) · e2e/ (Playwright, P1+)
docs/
  product/SPEC.md · design/DESIGN.md · design/anthropic-frontend-design.SKILL.md · i18n/開發說明書.md
demo/
  index.html  the zero-backend interactive demo (pixel reference)
```

## Getting started

```bash
pnpm install
cp .env.example .env        # fill VITE_SUPABASE_URL / ANON_KEY / VAPID_PUBLIC_KEY
pnpm dev                    # Vite dev server → http://localhost:5173
```

Without a `.env`, the app runs in a **P0 preview mode**: the login screen lets you enter either the
parent or teacher shell so the ported UI is reviewable before the backend is wired.

### Database (local, P1+)

```bash
supabase start              # local Postgres + Auth + Storage + Realtime (needs Docker)
supabase db reset           # apply migrations + seed
pnpm gen:types              # regenerate src/types/db.ts from the local DB
```

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test                   # unit + contract tests
pnpm test:rls               # RLS isolation (P1+)
pnpm test:e2e               # Playwright critical flows (P1+)
pnpm test:visual            # visual regression (P5)
```

## Status — P0 (Foundation)

Done: project scaffold, design tokens + global styles ported 1:1, UI primitives, route skeleton
(`/login`, `/p`, `/t`), Supabase client + query-key factory + realtime helper, service-layer stubs
matching the §8 contracts, and the initial schema + RLS migration.

Next: **P1** — auth, teacher create-class/add-students, invite codes, parent binding, and the RLS
isolation tests. See milestones in [`DEVELOPMENT.md §15`](./DEVELOPMENT.md).
