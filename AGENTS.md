# AGENTS.md — Start Here (ClassConnect)

> **Read this file first.** It is the operational rulebook for any AI/engineer working in this
> repository. It turns the "10 rails" (DEVELOPMENT.md §18) into concrete, day-one actions.
> If anything here conflicts with your own assumptions, this file wins.

---

## 0. Read order (do this before writing code)

1. **`AGENTS.md`** (this file) — rules, commands, the golden path.
2. **`DEVELOPMENT.md`** / **`docs/i18n/開發說明書.md`** — stack, schema, RLS, interface contracts, milestones. (Same content, EN/中文.)
3. **`docs/product/SPEC.md`** — product features & business logic (L1–L15). Authority for behavior.
4. **`docs/design/DESIGN.md`** — visual design system. Authority for look.
5. **`demo/index.html`** — the demo; pixel-level reference for look, motion, and copy.

> **Docs layout:** authoritative handbooks `AGENTS.md` + `DEVELOPMENT.md` stay at repo root. Reference material is filed under `docs/` (`docs/product/`, `docs/design/`, `docs/i18n/`) and the zero-backend demo under `demo/`.

**Where answers live:** *what a feature does* → docs/product/SPEC.md · *how it looks* → docs/design/DESIGN.md + demo/index.html · *how it's built / interfaces / permissions* → DEVELOPMENT.md.

---

## 1. Golden rules (non-negotiable)

1. 🔒 **Privacy is enforced by RLS, never by the frontend.** Every table has Row Level Security. A parent must never be able to read another child's data. Any feature touching data ships with RLS + an RLS test (§5, rail 6).
2. 🎨 **Do not freestyle visuals.** Reuse the demo's tokens/components/motion (DEVELOPMENT.md §10). New UI = compose existing `ui/` components. Visual changes must pass visual-regression (rail 3).
3. 🧩 **All data access goes through `services/*.ts`.** No inline Supabase queries inside components (rail 5).
4. 🗃️ **Schema changes go through migrations only.** Never hand-edit the DB (rail 7).
5. ✅ **Nothing merges unless CI is green** (typecheck, lint, unit, RLS, e2e smoke, visual) (rail 10).
6. ♻️ **Preserve demo logic:** show-only-if-published, empty states, single-side updates, no input loss (SPEC L2/L14/L15).

---

## 2. Repo map (where things go)

```
src/services/*.ts   → the ONLY place that talks to Supabase (interface contracts: DEVELOPMENT.md §8)
src/hooks/*         → TanStack Query wrappers around services
src/features/*      → one folder per feature (screens + local components). Change here = low blast radius (rail 8)
src/ui/*            → design-system components ported from the demo (rail 2). Reuse, don't recreate.
src/types/db.ts     → generated (`supabase gen types`). Never edit by hand (rail 4)
src/types/domain.ts → hand-written domain types (DEVELOPMENT.md §8.1)
supabase/migrations → versioned schema + RLS (rail 7)
supabase/functions  → Edge Functions (redeem_invite, send_push)
tests/rls/*         → RLS isolation tests (rail 6)
tests/e2e/*         → Playwright critical-flow tests (rail 9)
.storybook/, *.stories.tsx → component catalog + visual source of truth (rail 2/3)
```

---

## 3. Commands (memorize these)

```bash
# setup
pnpm install
cp .env.example .env            # fill VITE_SUPABASE_URL / ANON_KEY / VAPID_PUBLIC_KEY

# dev
pnpm dev                        # Vite dev server
pnpm storybook                  # component catalog (design source of truth)

# database
supabase start                  # local stack
supabase db reset               # apply all migrations + seed (rail 7/9)
pnpm gen:types                  # supabase gen types → src/types/db.ts (rail 4)

# quality gates (run before every commit)
pnpm typecheck
pnpm lint
pnpm test                       # unit + contract tests (rail 5)
pnpm test:rls                   # RLS isolation tests (rail 6) — MUST pass
pnpm test:e2e                   # Playwright critical flows (rail 9)
pnpm test:visual                # visual regression (rail 3)
```

> If a command doesn't exist yet, create it as part of P0/P1 (DEVELOPMENT.md §15) and update this file.

---

## 4. The golden path — how to add or change a feature

Follow these steps **in order** every time. This is what keeps changes fast *and* stable.

1. **Read** the feature's rules in `docs/product/SPEC.md` and its look in `demo/index.html` / `docs/design/DESIGN.md`.
2. **Schema** (if needed): add a migration in `supabase/migrations/`. Include table + **RLS policies** in the same migration. Run `supabase db reset`, then `pnpm gen:types`.
3. **RLS test**: add/extend `tests/rls/*` to prove isolation (parent A ≠ parent B; teacher scoped to own class). See §5 example.
4. **Service**: add functions in `src/services/<feature>.ts` matching the contract in DEVELOPMENT.md §8. Add a contract test.
5. **Hook**: wrap the service in `src/hooks/` with a TanStack Query key from `lib/queryKeys.ts`. Wire Realtime invalidation if the data is shared (DEVELOPMENT.md §8.4).
6. **UI**: build the screen in `src/features/<parent|teacher>/` by composing `src/ui/` components. Do not introduce new visual primitives without a Storybook story.
7. **Story**: add/update `*.stories.tsx` for any new/changed UI. This updates the visual source of truth and enables visual regression.
8. **e2e** (if it's a critical flow): extend `tests/e2e/`.
9. **Gates**: run all of §3 quality gates locally. All green → open PR. CI must be green to merge.

**Definition of Done for a PR:** typecheck ✅ lint ✅ unit ✅ RLS ✅ e2e smoke ✅ visual ✅ · behavior matches SPEC · look matches demo · migration reversible.

---

## 5. RLS test pattern (rail 6 — the most important test)

Every data feature MUST have a test proving cross-parent isolation. Example shape:

```ts
// tests/rls/scores.test.ts
test('parent A cannot read parent B child score', async () => {
  const a = clientFor(parentA_jwt);   // anon client with parent A session
  const { data, error } = await a
    .from('scores')
    .select('*')
    .eq('student_id', childOfParentB.id);
  expect(data ?? []).toHaveLength(0);  // RLS returns nothing (not an error leak)
});

test('teacher cannot manage another class', async () => {
  const t = clientFor(teacherX_jwt);
  const { error } = await t.from('announcements')
    .insert({ class_id: classOfTeacherY.id, title: 'x', author_id: teacherX.id });
  expect(error).toBeTruthy();          // blocked by RLS with check
});
```

Rule: **a feature is not done until its RLS test exists and passes.**

---

## 6. CI gates (rail 10)

CI runs on every PR and blocks merge on failure. Minimum jobs:

```yaml
# .github/workflows/ci.yml (outline)
jobs:
  quality:
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: supabase db reset          # apply migrations + seed
      - run: pnpm test:rls              # isolation
      - run: pnpm test:e2e              # critical flows
      - run: pnpm test:visual           # visual regression (Chromatic/Playwright snapshots)
```

Fast changes are safe **because** these gates exist. Do not disable a gate to land a change; fix the change.

---

## 7. Forbidden actions (do NOT)

- ❌ Query Supabase directly inside a component (use `services/*.ts`).
- ❌ Edit `src/types/db.ts` by hand (it is generated).
- ❌ Change the DB without a migration.
- ❌ Add a UI primitive/color/spacing not in `docs/design/DESIGN.md` / demo tokens.
- ❌ Filter private data only on the frontend and assume it's safe (must be RLS).
- ❌ Merge with a skipped or red gate.
- ❌ Let the demo (`demo/index.html`) and prod drift silently — if you change UX in prod, update Storybook so it stays the source of truth.

---

## 8. When to use the demo vs. develop directly

- **Small–medium feature changes** → develop directly here in the prod repo.
- **Exploring a brand-new UX/visual "feel"** → prototype in the demo (`demo/index.html`, zero backend) or in Storybook, then land it via the golden path (§4).
- Once Storybook exists, prefer it over editing the demo — it stays in sync with prod.

---

## 9. The 10 rails → where each lives (quick index)

| # | Rail | Home in repo |
| --- | --- | --- |
| 1 | Machine-readable rules | **this file** |
| 2 | Design system + Storybook | `src/ui/`, `.storybook/`, `*.stories.tsx` |
| 3 | Visual regression | `pnpm test:visual` in CI |
| 4 | End-to-end types | `pnpm gen:types` → `src/types/db.ts` |
| 5 | Service layer + contract tests | `src/services/*`, `tests/` |
| 6 | RLS policy tests | `supabase/migrations`, `tests/rls/*` |
| 7 | Migrations only | `supabase/migrations` |
| 8 | Feature-sliced architecture | `src/features/*` |
| 9 | Seed + staging + e2e | `supabase/seed.sql`, `tests/e2e/*` |
| 10 | CI gates | `.github/workflows/ci.yml` |

Full rationale: `DEVELOPMENT.md §18`.
