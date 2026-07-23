# ClassConnect · Production Engineering Handbook

> This is the **single entry point** for the AI / engineer implementing the product.
> Goal: upgrade the existing interactive demo (`demo/index.html`) into a production app whose
> features and look are **1:1 with the demo**.
> (Chinese version: `docs/i18n/開發說明書.md`.)

## 0. How to use this document (guidance for the implementing AI)

**Reading order (follow strictly):**
1. **`AGENTS.md`** — the operational rulebook: golden rules, commands, and the "golden path" for adding/changing a feature. Read it first.
2. **This file (DEVELOPMENT.md)** — stack, architecture, data model, permissions, interface contracts, milestones.
3. **`docs/product/SPEC.md`** — product features and business logic (L1–L15); the authority for every screen's behavior.
4. **`docs/design/DESIGN.md`** — the visual design system (color / type / components / motion) authority.
5. **`demo/index.html`** — the existing demo; the **pixel-level reference** for look and interaction. All layouts, animations, and copy follow it.

**Division of the documents:**
- What a feature does / when it shows → `docs/product/SPEC.md`.
- How a screen looks / colors, fonts, motion → `docs/design/DESIGN.md` + `demo/index.html`.
- Which tech, how data is stored, how interfaces are called, how permissions are enforced → this file.

**Hard rules:**
- ⚠️ Do not freestyle the visuals. Reuse the demo's CSS tokens, component looks, and animations (§10).
- ⚠️ Privacy is the core value. All data access MUST go through Supabase RLS (§6); frontend filtering does not count.
- ⚠️ Preserve the demo's logic (SPEC L2/L14/L15: show-only-if-published, empty states, single-side re-render, no input loss).

---

## 1. Product overview (summary)

A parent–teacher communication platform with a **parent app** and a **teacher app** (one app, rendered by role). Positioning: structured, trackable (read receipts / sign tracking), less work for teachers, calmer for parents, and it preserves the child's growth — beating LINE groups + paper contact books. Full positioning and features: `docs/product/SPEC.md §0`.

**Roles:** Teacher (homeroom, manages their own class) and Parent (one account can link to one or more children; sees only their own children).

---

## 2. Tech stack & architecture

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | **React 18 + TypeScript** | Function components + Hooks |
| Build | **Vite** | Fast; first-class PWA plugin |
| Routing | **React Router v6** | See §9 |
| Server state | **TanStack Query v5** | Cache, optimistic updates, offline persistence |
| Backend | **Supabase** | Postgres + Auth + Storage + Realtime + Edge Functions |
| Styling | **Native CSS (ported from demo) + CSS Modules** | No Tailwind/UI kit, to guarantee visual parity (§10) |
| Forms | React Hook Form (optional) | Demo forms are simple |
| PWA | **vite-plugin-pwa (Workbox)** | Installable + offline reads + Web Push |
| Push | **Web Push (VAPID) + Supabase Edge Function** | See §11 |
| Deploy | Frontend on Vercel/Netlify/Cloudflare Pages; backend on Supabase | See §14 |

**Data flow (unidirectional, Supabase is the single source of truth):**

```
UI components ──call──▶ services/*.ts (wrap supabase-js) ──▶ Supabase (Postgres + RLS)
   ▲                                                              │
   │                                                              ▼
TanStack Query cache ◀── Realtime subscriptions (postgres_changes, filtered by class_id)
```

- **Reads:** components use Query hooks (`useXxx`) which call `services/*.ts`.
- **Writes:** components call a service mutation → on success invalidate the matching query key; Realtime pushes other devices' changes, achieving SPEC L12 ("teacher edits, parent sees it live").
- **Permissions:** always enforced by RLS. Frontend only does UX-level display filtering (SPEC L2).

---

## 3. Project structure

```
src/
  main.tsx                 # entry: mount QueryClientProvider / Router / AuthProvider
  app/
    router.tsx             # route table (§9)
    AuthProvider.tsx       # listens to supabase.auth, exposes useAuth()
    RoleGate.tsx           # route to parent/teacher UI by role
  lib/
    supabase.ts            # createClient (singleton)
    queryKeys.ts           # unified query-key factory
    realtime.ts            # subscription helpers (§8.4)
  services/                # data-access layer (interface contracts, §8)
    announcements.ts  contact.ts  grades.ts  growth.ts
    calendar.ts  leaves.ts  consent.ts  messages.ts
    classes.ts  students.ts  invites.ts  push.ts  storage.ts
  hooks/                   # TanStack Query wrappers (useAnnouncements, etc.)
  features/                # per-feature folders (screens + components)
    parent/  teacher/  shared/
  ui/                      # base components ported from the demo (§10)
    tokens.css  Ring.tsx  Card.tsx  Feature.tsx  Timeline.tsx
    ChatBubble.tsx  Alert.tsx  CalItem.tsx  TabBar.tsx  AppBar.tsx ...
  types/
    db.ts                  # generated by `supabase gen types`
    domain.ts              # frontend domain types (§8.1)
  styles/
    global.css             # global styles extracted from demo/index.html
supabase/
  migrations/*.sql         # schema + RLS (§5, §6)
  functions/               # Edge Functions (redeem_invite, send_push)
public/
  manifest.webmanifest  icons/  service worker generated by the plugin
```

---

## 4. Environment

`.env` (frontend; Vite requires `VITE_` prefix):

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_VAPID_PUBLIC_KEY=BModern...        # Web Push public key
```

Supabase project setup:
- Auth: enable Email (Magic Link recommended for low-frequency users; password optional).
- Storage: create bucket `photos` (private).
- Edge Function secrets: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `SERVICE_ROLE_KEY`.

`src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
```

---

## 5. Data model (Supabase / Postgres schema)

> Demo vs. prod: demo is "single class, single child, localStorage"; prod is "multi-class, multi-child, multi-parent, RLS-isolated."
> Every table must `alter table ... enable row level security;` (see §6).

### 5.1 Enums

```sql
create type role_t         as enum ('teacher','parent');
create type event_type_t   as enum ('exam','activity','fee','holiday');
create type leave_type_t   as enum ('sick','personal','late');
create type leave_status_t as enum ('pending','approved','rejected');
create type photo_vis_t    as enum ('class','guardians','private');
create type sender_role_t  as enum ('teacher','parent');
```

### 5.2 Core tables

```sql
-- user profile (1:1 with auth.users)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          role_t not null,
  display_name  text not null,
  locale        text not null default 'zh-Hant',
  created_at    timestamptz not null default now()
);

-- class (owned by a teacher)
create table classes (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references profiles(id) on delete cascade,
  name          text not null,                     -- e.g. Grade 1 Class A
  office_hours  text default 'Weekdays 17:00-20:00',
  created_at    timestamptz not null default now()
);

-- student (the child)
create table students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  seat       text not null,                        -- e.g. '07'
  name       text not null,
  created_at timestamptz not null default now(),
  unique (class_id, seat)
);

-- parent <-> student (many-to-many)
create table guardianships (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  parent_id  uuid not null references profiles(id) on delete cascade,
  relation   text,
  unique (student_id, parent_id)
);

-- invite codes (teacher creates; parent binds to a student)
create table invites (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz,
  used_at    timestamptz,
  used_by    uuid references profiles(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
```

### 5.3 Feature tables

```sql
-- announcements
create table announcements (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes(id) on delete cascade,
  author_id    uuid not null references profiles(id),
  title        text not null,
  body         text,
  important    boolean not null default false,
  scheduled_at timestamptz,                         -- null = immediate
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
-- read receipts (one row per parent per announcement)
create table announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  parent_id       uuid not null references profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, parent_id)
);

-- contact book: homework / bring items (keyed by date)
create table homework_items (
  id        uuid primary key default gen_random_uuid(),
  class_id  uuid not null references classes(id) on delete cascade,
  due_date  date not null,
  text      text not null,
  note      text,
  created_at timestamptz not null default now()
);
-- per-student completion (parent checks off)
create table homework_status (
  homework_id uuid not null references homework_items(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  done        boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (homework_id, student_id)
);
create table bring_items (
  id        uuid primary key default gen_random_uuid(),
  class_id  uuid not null references classes(id) on delete cascade,
  due_date  date not null,
  text      text not null,
  note      text,
  created_at timestamptz not null default now()
);

-- grades
create table exams (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  name       text not null,
  published  boolean not null default false,       -- SPEC L4 published
  show_dist  boolean not null default true,        -- SPEC L4 showDist
  created_at timestamptz not null default now()
);
create table scores (
  exam_id    uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score      int check (score between 0 and 100),
  primary key (exam_id, student_id)
);

-- growth: teacher notes / milestones / photos (all per student)
create table performance_notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  emoji      text, title text not null, body text,
  created_at timestamptz not null default now()
);
create table milestones (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  emoji      text, title text not null, body text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create table photos (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes(id) on delete cascade,
  student_id   uuid references students(id) on delete set null, -- null = class-wide
  caption      text,
  storage_path text not null,
  visibility   photo_vis_t not null default 'guardians',
  created_at   timestamptz not null default now()
);

-- calendar
create table events (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  title      text not null,
  event_date date not null,
  type       event_type_t not null,
  created_at timestamptz not null default now()
);

-- online leave requests
create table leaves (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  parent_id   uuid not null references profiles(id),
  leave_date  date not null,
  type        leave_type_t not null,
  reason      text,
  status      leave_status_t not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- consent forms
create table consent_forms (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  title      text not null,
  body       text,
  deadline   date,
  created_at timestamptz not null default now()
);
create table consent_signatures (
  consent_id uuid not null references consent_forms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  signed_by  uuid not null references profiles(id),
  signed_at  timestamptz not null default now(),
  primary key (consent_id, student_id)
);

-- direct messages (one conversation = teacher <-> a student's guardians)
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  sender_role     sender_role_t not null,
  text            text not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

-- Web Push subscriptions
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
```

### 5.4 Derived / computed values (not stored; compute in frontend or SQL views; see SPEC L4/L5/L9)

- **Grade buckets & percentile**: computed from `scores` (buckets 90–100 / 80–89 / 70–79 / 60–69 / ≤59).
- **Announcement read count**: `count(announcement_reads)` / number of guardians in class.
- **Consent sign rate & unsigned list**: `students` minus `consent_signatures`.
- **Growth timeline / memory book**: `milestones` + a grade milestone (when exam.published & the student has a score) + `performance_notes`, merged & sorted.

Example helper view:

```sql
create view v_announcement_read_stats as
select a.id as announcement_id, a.class_id,
       count(distinct r.parent_id) as read_count,
       (select count(distinct g.parent_id) from students s
          join guardianships g on g.student_id = s.id
        where s.class_id = a.class_id) as guardian_count
from announcements a
left join announcement_reads r on r.announcement_id = a.id
group by a.id;
```

---

### 5.5 Feature gating & onboarding (SPEC L16/L17) — planned for P2

> Goal: a new class only shows the **core 3** features; the teacher opts into the rest, one by one.
> Onboarding tours are short, shown once, and dismissible.

```sql
-- Per-class feature switches. Row created on class creation with core-3 enabled.
create table class_features (
  class_id  uuid not null references classes(id) on delete cascade,
  feature   text not null,            -- 'announcements'|'contact'|'messages'|'grades'|'growth'|'calendar'|'leave'|'consent'
  enabled   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (class_id, feature)
);
-- RLS: teacher of the class manages; any class member reads (parents render tabs by these flags).
-- alter table class_features enable row level security;
-- create policy cf_read    on class_features for select using ( is_class_member(class_id) );
-- create policy cf_manage  on class_features for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- Per-user onboarding memory (which tours/point-outs have been seen). One row per user.
create table onboarding_state (
  profile_id uuid primary key references profiles(id) on delete cascade,
  seen       jsonb not null default '{}'::jsonb,   -- e.g. { "teacher_welcome": true, "grades_pointout": true }
  updated_at timestamptz not null default now()
);
-- create policy ob_self on onboarding_state for all using ( profile_id = auth.uid() ) with check ( profile_id = auth.uid() );
```

- **Core 3 (always enabled, cannot disable):** `announcements`, `contact`, `messages`.
- **Opt-in (default disabled):** `grades`, `growth`, `calendar`, `leave`, `consent`.
- **Rendering rule:** a parent tab/entry shows only when its feature is `enabled` **AND** it has content (SPEC L2). The switch = teacher intent; L2 = data presence.
- **Disabling hides the entry only** (never deletes data) — re-enabling restores it (golden rule 6).
- **On class creation**, seed `class_features` with the core 3 = `true`, others = `false` (do it in the `createClass` service or a DB trigger).
- **Onboarding**: gate tour rendering on `onboarding_state.seen[key]`; write the key on skip/finish. Keep copy ≤ 1 sentence/step; reuse existing DESIGN tokens (no new visual primitives).
- **Services (add in P2):** `getClassFeatures(classId)`, `setClassFeature(classId, feature, enabled)`, `getOnboarding()`, `markOnboardingSeen(key)` — with contract + RLS tests.

---

## 6. Permissions & privacy (RLS) — the most important section

> The demo relies on frontend filtering; production MUST rely on RLS to satisfy SPEC L1 (data isolation).
> Parents can only access their own children; teachers can only manage their own classes.

### 6.1 Helper functions (security definer)

```sql
create or replace function is_teacher_of(cid uuid) returns boolean
language sql security definer stable as $$
  select exists(select 1 from classes c where c.id = cid and c.teacher_id = auth.uid());
$$;

create or replace function is_guardian_of(sid uuid) returns boolean
language sql security definer stable as $$
  select exists(select 1 from guardianships g
                where g.student_id = sid and g.parent_id = auth.uid());
$$;

create or replace function is_class_member(cid uuid) returns boolean
language sql security definer stable as $$
  select is_teacher_of(cid)
      or exists(select 1 from students s
                join guardianships g on g.student_id = s.id
                where s.class_id = cid and g.parent_id = auth.uid());
$$;
```

### 6.2 Policy patterns (every table needs them)

**Class-level data (announcements / bring / calendar / consent headers…) — teacher writes, whole class reads:**

```sql
alter table announcements enable row level security;

create policy ann_read on announcements for select
  using ( is_class_member(class_id) );

create policy ann_write on announcements for all
  using ( is_teacher_of(class_id) )
  with check ( is_teacher_of(class_id) );
```
(`events`, `bring_items`, `homework_items`, `consent_forms`, `exams` follow the same pattern.)

**Student-private data (scores / notes / milestones / leaves / messages) — teacher manages the class, parents read only their child:**

```sql
alter table scores enable row level security;

create policy scores_teacher on scores for all
  using ( exists(select 1 from exams e where e.id = exam_id and is_teacher_of(e.class_id)) )
  with check ( exists(select 1 from exams e where e.id = exam_id and is_teacher_of(e.class_id)) );

create policy scores_parent_read on scores for select
  using ( is_guardian_of(student_id)
          and exists(select 1 from exams e where e.id = exam_id and e.published) );
```

**Grade "distribution" privacy (SPEC L4):** individual scores are locked to "own child" by the policy above; the class distribution is a **de-identified aggregate** returned via a view/RPC (counts per bucket only, no names) and requires `exam.show_dist = true`. Frontend calls `getDistribution(examId)` (§8).

**Parent homework check-off (homework_status):**

```sql
alter table homework_status enable row level security;
create policy hw_status_parent on homework_status for all
  using ( is_guardian_of(student_id) )
  with check ( is_guardian_of(student_id) );
create policy hw_status_teacher_read on homework_status for select
  using ( exists(select 1 from homework_items h where h.id = homework_id and is_teacher_of(h.class_id)) );
```

**Read receipts:** parents insert/select their own; teacher reads aggregate (via the §5.4 view, itself RLS-limited or exposed via a security-definer RPC).

```sql
alter table announcement_reads enable row level security;
create policy reads_parent on announcement_reads for all
  using ( parent_id = auth.uid() ) with check ( parent_id = auth.uid() );
```

**Leaves:** parent insert/select for own child; teacher select/update (review).

```sql
alter table leaves enable row level security;
create policy leaves_parent on leaves for select using ( is_guardian_of(student_id) );
create policy leaves_parent_insert on leaves for insert with check ( is_guardian_of(student_id) and parent_id = auth.uid() );
create policy leaves_teacher on leaves for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
```

**Consent signatures:** parent insert/select for own child; teacher select for class.
**Messages:** a conversation belongs to a class+student; the homeroom teacher and that student's guardians can read/write; `sender_id` on insert must equal `auth.uid()`.

```sql
alter table messages enable row level security;
create policy msg_access on messages for select using (
  exists(select 1 from conversations c where c.id = conversation_id
         and ( is_teacher_of(c.class_id) or is_guardian_of(c.student_id) ))
);
create policy msg_send on messages for insert with check (
  sender_id = auth.uid()
  and exists(select 1 from conversations c where c.id = conversation_id
             and ( is_teacher_of(c.class_id) or is_guardian_of(c.student_id) ))
);
```

**Storage (photos bucket):** use Storage RLS; path prefix includes class_id; policy checks `is_class_member`. Uploads limited to the teacher.

> ✅ Acceptance: with "parent A's token," attempting to read parent B's child's scores/photos/messages MUST be blocked by RLS (empty or 403).

---

## 7. Auth & account flow (invite-based)

### 7.1 Teacher
1. Sign up / sign in by email → create `profiles(role='teacher')` (auto-created via auth trigger).
2. Create a `classes` row → add `students` (seat, name; CSV batch allowed).
3. Generate `invites` per student (short code + link `/join/:code`, optional expiry).

### 7.2 Parent
1. Open invite link `/join/:code` → sign up / sign in by email.
2. Call Edge Function `redeem_invite` (security definer, atomic):
   - validate code (not expired, not used);
   - create/update `profiles(role='parent')`;
   - create `guardianships(student_id, parent_id)`;
   - mark invite `used_at/used_by`;
   - ensure the student's `conversations` row exists.
3. Afterwards the parent only sees their linked children.

`redeem_invite` interface:

```ts
// POST /functions/v1/redeem_invite  body: { code: string, displayName: string, relation?: string }
// returns: { studentId: string, classId: string }
```

### 7.3 Auth trigger (auto-create profile)

```sql
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles(id, role, display_name)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::role_t,'parent'),
          coalesce(new.raw_user_meta_data->>'display_name','User'))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 8. Data-access layer (interface contracts)

> All components access data **only through `services/*.ts`** — never inline supabase queries in screens.
> Each service function maps to a TanStack Query hook (`hooks/`).

### 8.1 Frontend domain types (`types/domain.ts`)

```ts
export type Role = 'teacher' | 'parent';
export type EventType = 'exam' | 'activity' | 'fee' | 'holiday';
export type LeaveType = 'sick' | 'personal' | 'late';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Student { id: string; classId: string; seat: string; name: string; }
export interface Announcement {
  id: string; classId: string; title: string; body: string | null;
  important: boolean; publishedAt: string; scheduledAt: string | null;
  read?: boolean;            // whether the current parent has read it (joined)
  readCount?: number;        // teacher-side aggregate
}
export interface HomeworkItem { id: string; text: string; note: string | null; dueDate: string; done?: boolean; }
export interface BringItem { id: string; text: string; note: string | null; dueDate: string; }
export interface Exam { id: string; classId: string; name: string; published: boolean; showDist: boolean; }
export interface DistBucket { range: string; lo: number; hi: number; count: number; }
export interface GrowthItem { kind: 'milestone' | 'grade' | 'note'; emoji: string; title: string; desc: string; date: string; }
export interface CalendarEvent { id: string; title: string; eventDate: string; type: EventType; }
export interface Leave { id: string; studentId: string; studentName?: string; seat?: string; leaveDate: string; type: LeaveType; reason: string | null; status: LeaveStatus; }
export interface ConsentForm { id: string; title: string; deadline: string | null; }
export interface ConsentStatus { signed: Student[]; unsigned: Student[]; rate: number; }
export interface Message { id: string; conversationId: string; senderRole: Role; text: string; createdAt: string; }
```

### 8.2 Read interfaces (each returns a Promise; wrapped by a hook)

```ts
// classes.ts
getMyClasses(): Promise<Class[]>                       // teacher: own classes; parent: children's classes
getClass(classId: string): Promise<Class>
// students.ts
getRoster(classId: string): Promise<Student[]>         // teacher: full roster; parent: only own child
getMyChildren(): Promise<Student[]>                    // parent

// announcements.ts
listAnnouncements(classId: string): Promise<Announcement[]>          // parent side carries read state
listAnnouncementsWithStats(classId: string): Promise<Announcement[]> // teacher side carries readCount

// contact.ts
listHomework(classId: string, date: string, studentId?: string): Promise<HomeworkItem[]> // studentId → carries done
listBring(classId: string, date: string): Promise<BringItem[]>
getHomeworkCompletion(classId: string, date: string): Promise<{ done: number; total: number }> // teacher stat

// grades.ts
listExams(classId: string): Promise<Exam[]>
getMyChildScore(examId: string, studentId: string): Promise<number | null>   // parent; RLS guarantees own only
getDistribution(examId: string): Promise<DistBucket[]>                        // de-identified; requires show_dist
getPercentile(examId: string, studentId: string): Promise<number>            // "beats X%"
getExamRoster(examId: string): Promise<{ student: Student; score: number | null }[]> // teacher score entry

// growth.ts
getGrowthTimeline(studentId: string): Promise<GrowthItem[]>
getMemoryBookStats(studentId: string): Promise<{ photos: number; notes: number; milestones: number; latestScore: number | null }>
listPhotos(studentId: string): Promise<Photo[]>

// calendar.ts
listEvents(classId: string): Promise<CalendarEvent[]>
// leaves.ts
listLeavesForParent(studentId: string): Promise<Leave[]>
listPendingLeaves(classId: string): Promise<Leave[]>       // teacher to-do
// consent.ts
listConsentForms(classId: string): Promise<ConsentForm[]>
getConsentStatus(consentId: string): Promise<ConsentStatus>          // teacher tracking
getMyConsentPending(studentId: string): Promise<ConsentForm[]>       // parent: pending
// messages.ts
getConversation(classId: string, studentId: string): Promise<{ id: string; officeHours: string }>
listMessages(conversationId: string): Promise<Message[]>
```

### 8.3 Write interfaces (mutations)

```ts
// teacher
createAnnouncement(input: { classId; title; body; important; scheduledAt? }): Promise<Announcement>
deleteAnnouncement(id: string): Promise<void>
addHomework(input: { classId; dueDate; text; note? }): Promise<HomeworkItem>
addBring(input: { classId; dueDate; text; note? }): Promise<BringItem>
copyYesterdayContact(classId: string, targetDate: string): Promise<void>   // SPEC L11
upsertExam(input: { id?; classId; name; published; showDist }): Promise<Exam>
setScore(examId: string, studentId: string, score: number | null): Promise<void>
addPerformanceNote(input: { classId; studentId; emoji; title; body }): Promise<void>
addMilestone(input: { classId; studentId; emoji; title; body; occurredOn }): Promise<void>
uploadPhoto(input: { classId; studentId?; file: File; caption; visibility }): Promise<Photo>
addEvent(input: { classId; title; eventDate; type }): Promise<CalendarEvent>
reviewLeave(id: string, status: 'approved' | 'rejected'): Promise<void>
createConsentForm(input: { classId; title; body?; deadline? }): Promise<ConsentForm>
remindUnsigned(consentId: string): Promise<{ notified: number }>            // triggers push
sendMessage(conversationId: string, text: string): Promise<Message>         // sender_role='teacher'

// parent
toggleHomeworkDone(homeworkId: string, studentId: string, done: boolean): Promise<void>
markAnnouncementRead(announcementId: string): Promise<void>
submitLeave(input: { studentId; leaveDate; type; reason }): Promise<Leave>
signConsent(consentId: string, studentId: string): Promise<void>
sendMessageAsParent(conversationId: string, text: string): Promise<Message>
savePushSubscription(sub: PushSubscriptionJSON): Promise<void>
```

> Mapping to the demo's `data-act`: every demo action maps to one mutation above (e.g. `ann-read`→`markAnnouncementRead`, `submit-leave`→`submitLeave`, `approve-leave`→`reviewLeave`, `copy-yesterday`→`copyYesterdayContact`, `remind-unsigned`→`remindUnsigned`). Full table in §17.

### 8.4 Realtime

Use `postgres_changes` filtered by `class_id`; invalidate the matching query on change:

```ts
// realtime.ts
export function subscribeClass(classId: string, onChange: (table: string) => void) {
  const ch = supabase.channel(`class:${classId}`);
  ['announcements','homework_items','homework_status','bring_items','exams','scores',
   'events','leaves','consent_signatures','messages','performance_notes','milestones']
    .forEach(t => ch.on('postgres_changes',
      { event: '*', schema: 'public', table: t, filter: `class_id=eq.${classId}` },
      _p => onChange(t)));
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}
```

> This implements SPEC L12: any teacher change reaches the parent app live (across devices). `messages` has no class_id — subscribe by `conversation_id` on a separate channel.

### 8.5 Storage (photos)

```ts
// storage.ts
uploadClassPhoto(classId, studentId | null, file): Promise<{ path: string }>
// path: class/{classId}/{studentId ?? 'class'}/{uuid}.{ext}
getSignedPhotoUrl(path: string, expiresSec = 3600): Promise<string>
```

---

## 9. Routing & screen mapping

| Path | Role | Demo screen |
| --- | --- | --- |
| `/login` | shared | login |
| `/join/:code` | parent | invite binding (new flow) |
| `/p` | parent | home (tab) |
| `/p/contact` `/p/announcements` `/p/growth` `/p/grades` | parent | tabs |
| `/p/calendar` `/p/leave` `/p/chat` `/p/book` | parent | sub-view (Back doesn't change the tab) |
| `/t` | teacher | overview (with to-do) |
| `/t/announcements` `/t/contact` `/t/growth` `/t/grades` | teacher | tabs |
| `/t/leaves` `/t/consent` `/t/chat` | teacher | to-do sub-views |

- After login, route by `profile.role` to `/p` or `/t` (`RoleGate`).
- Tabs appear dynamically per SPEC L2 (growth/grades depend on data existence & published).

---

## 10. UI / visual parity (1:1 with the demo)

> Hard requirement: production look, spacing, radii, shadows, motion, and copy must match `demo/index.html`. Do this by **porting the demo's CSS into the component library** — do not redraw.

### 10.1 Design tokens (copy verbatim from `demo/index.html :root` into `ui/tokens.css`)

```css
:root{
  --ink:#212a33; --ink-soft:#4b5a67; --muted:#8a97a3; --line:#e9edf1; --card:#fff;
  --primary:#2f9e8f; --primary-deep:#227a6e; --primary-soft:#e4f4f1;
  --accent:#f2994a; --accent-soft:#fdefe1; --pink:#ef6f7b; --pink-soft:#fdeaec;
  --blue:#4a86c5; --blue-soft:#e7f0f9;
  --paper:#fbfaf7;
  --radius:26px;
  --shadow-lift:0 34px 70px -30px rgba(31,45,58,.45);
  --shadow-card:0 1px 2px rgba(31,45,58,.05), 0 12px 24px -18px rgba(31,45,58,.5);
  --font-display:"Noto Serif TC",serif;
}
/* body font: Noto Sans TC. Load via Google Fonts, same <link> as the demo. */
```

Full color semantics, font roles, spacing rhythm, and motion rules are governed by `docs/design/DESIGN.md`.

### 10.2 Component mapping (demo class → React component)

| demo element / class | React component | Notes |
| --- | --- | --- |
| `.phone/.screen/.scr-scroll` | `PhoneShell` | prod can drop the phone frame; keep the rounded floating panel + grabber |
| `.appbar.p/.t` | `<AppBar variant="p|t" back? />` | colored title bar + back button |
| `.tabbar/.tab` | `<TabBar items />` | bottom tabs |
| `.feature` + `ring()` | `<Feature>` `<Ring pct />` | SVG progress ring (port the demo's `ring()` math) |
| `.card/.lab/.row` | `<Card>` | white floating card |
| `.qa-grid/.qa` | `<QuickActions>` | home quick actions |
| `.timeline/.tl-item` | `<Timeline>` | growth timeline (with stagger animation) |
| `.book` | `<MemoryBookCover>` | memory book cover |
| `.cal-item/.cal-type` | `<CalendarList>` | calendar |
| `.chat-wrap/.msg-b` | `<ChatThread>` `<ChatBubble>` | messaging (with pop animation) |
| `.alert` | `<TodoAlert>` | teacher to-do |
| `.rl/.st` | `<RosterStatusRow>` | consent roster |
| `.tmpl/.read-btn/.ghost-btn` | `<TemplateChip>`/`<ReadButton>`/`<GhostButton>` | templates / read / copy-yesterday |
| `.score-hero`/`.grade-row` | `<ScoreHero>`/`<DistBar>` | grades |
| `.check/.sw2` | `<Checkbox>`/`<Switch>` | checkbox / toggle (with transitions) |

### 10.3 Motion (reuse the demo)
- Page / view transitions: `page-anim` fadeUp.
- Timeline: `.tl-item` staggered `nth-child` delays.
- Chat bubbles: `pop`.
- Hover lift; rings/bars animate to their value.
- Rule: motion only to reinforce hierarchy; no gratuitous effects (per docs/design/DESIGN.md).

### 10.4 Navigation/perf details (per SPEC L15)
- Re-render only the acting side; achieve via Query cache + precise invalidation.
- Animate only on entering a view; preserve scroll position on data sync.
- Controlled state / RHF so inputs aren't lost when the other side updates (equivalent to the demo's compose scratch).

---

## 11. Push notifications (Web Push)

- Frontend: register service worker → `PushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })` → `savePushSubscription()` into `push_subscriptions`.
- Backend: Supabase Database Webhook / trigger invokes Edge Function `send_push` on:
  - new announcement (important first), grade published, leave reviewed, new message, unsigned-consent reminder (`remindUnsigned`).
- `send_push` uses the `web-push` library + VAPID private key to notify relevant `profile_id` subscriptions.

```ts
// functions/send_push  body: { profileIds: string[], title: string, body: string, url: string }
```

---

## 12. PWA

- `vite-plugin-pwa`: `registerType:'autoUpdate'`, `manifest` (name "ClassConnect", theme_color `#2f9e8f`, icons 192/512, `display:standalone`).
- Offline: precache static assets; use TanStack Query persist (IndexedDB) for offline reads; writes require online (or queue — phase 2).
- Add-to-home-screen prompt.

---

## 13. Non-functional requirements

- **Privacy/compliance**: students are minors; minimize PII; photos default to `guardians` visibility; provide delete/export. RLS is the first line of defense.
- **Accessibility**: semantic markup, WCAG AA contrast (governed by docs/design/DESIGN.md), keyboard operable, scalable text.
- **i18n**: architecture ready (zh-Hant first, then en / others for new-immigrant families).
- **Performance**: first paint < 2.5s (Fast 3G), lazy-load routes, compress images + cache signed URLs.

---

## 14. Deployment

- Frontend: Vercel / Netlify / Cloudflare Pages (Git auto-deploy).
- Backend: Supabase cloud; manage migrations via `supabase db push`; deploy Edge Functions via `supabase functions deploy`.
- Env separation: `dev` and `prod` Supabase projects.

---

## 15. Milestones (suggested order)

| Phase | Content | Definition of done |
| --- | --- | --- |
| P0 Foundation | Vite+React+TS project, supabase client, tokens.css, UI component library (§10.2), route skeleton | empty shell runs; look matches demo |
| P1 Accounts | schema + RLS (§5/§6), auth, teacher create-class/add-students, invite codes, parent binding | both roles can sign in; isolation tests pass |
| P2 Core four + gating | announcements(read), contact(check-off/stats), grades(privacy/dist), growth(timeline/book/photos); **feature gating (§5.5): core-3 on by default, teacher toggles, parent tabs follow (SPEC L16)** | each verified against SPEC; gating + L2 both respected; Realtime works |
| P3 Admin | calendar, online leave, consent tracking, messaging (all behind their L16 switches) | to-do linkage; two-way status sync |
| P4 Push/PWA | Web Push, PWA install, offline reads | installable; key events push |
| P5 Polish | onboarding tours (SPEC L17, short/once/dismissible), motion details, empty states, i18n, a11y, performance | tours ≤ 3 steps & shown once; motion matches demo; a11y checks pass |

> **Ease-of-use is a first-class requirement (SPEC L16/L17).** Every feature added from P2 on must: (a) register a `class_features` flag and respect it in both apps, and (b) ship a ≤1-sentence point-out shown once when first enabled. Communicate through design first; tours are the fallback, kept minimal.

---

## 16. Acceptance checklist (engineering + product)

Product acceptance follows `docs/product/SPEC.md §8` (L1–L15). Engineering additions:

- [ ] RLS enabled on all tables; cross-parent access (scores/photos/messages) is blocked (§6 acceptance)
- [ ] Parent app data contains only their own child (enforced by backend, not frontend filtering)
- [ ] Realtime: teacher change appears on parent's other device within < 2s (SPEC L12)
- [ ] Grade distribution is a de-identified aggregate, controlled by `show_dist`; individual score controlled by `published` (SPEC L4)
- [ ] Invite codes are one-time and expirable; `redeem_invite` is atomic
- [ ] Visual tokens / components / motion match `demo/index.html` (§10, docs/design/DESIGN.md)
- [ ] Dynamic tabs, empty states, single-side updates, no input loss (SPEC L2/L14/L15)
- [ ] Photos served via signed URLs, gated by visibility
- [ ] PWA installable, offline readable, key events push
- [ ] Lighthouse: PWA pass, a11y ≥ 90, performance ≥ 85 (mobile)

---

## 17. Appendix: demo action → production interface quick reference

| demo `data-act` | service function | table |
| --- | --- | --- |
| `login/logout` | supabase.auth | auth |
| `ptab/ttab/pview/tview/pback/tback` | frontend routing only (§9) | — |
| `toggle-hw` | `toggleHomeworkDone` | homework_status |
| `add-hw/del-hw/add-bring/del-bring` | `addHomework`… | homework_items/bring_items |
| `add-ann/del-ann` | `createAnnouncement/deleteAnnouncement` | announcements |
| `ann-read` | `markAnnouncementRead` | announcement_reads |
| `use-tmpl-ann` | frontend template fill | — |
| `copy-yesterday` | `copyYesterdayContact` | homework_items/bring_items |
| `save-grade / score:seat / published / showDist / exam` | `upsertExam/setScore` | exams/scores |
| `add-note/del-note/add-photo/del-photo` | `addPerformanceNote/uploadPhoto` | performance_notes/photos |
| `submit-leave` | `submitLeave` | leaves |
| `approve-leave/reject-leave` | `reviewLeave` | leaves |
| `sign-consent` | `signConsent` | consent_signatures |
| `remind-unsigned` | `remindUnsigned` | (push) |
| `send-msg-p/send-msg-t` | `sendMessageAsParent/sendMessage` | messages |
| `addcal` | frontend .ics generation | events(read) |
| `reset` | (demo-only; not in prod) | — |

---

## 18. Designing for change: fast & stable iteration

> Goal: when future features are added/adjusted, the responsible agent can move **fast** without **breaking** existing functionality (stability matters most). These are the "rails" to lay down during the build.

**Recommended workflow (do you go back to the demo to tweak?):**
- **Small-to-medium feature changes/additions** → develop directly in the production project; do not round-trip through the demo (avoids demo/prod drift).
- **Exploring a brand-new UX/visual direction, chasing a "feel" quickly** → use the demo (`demo/index.html`, zero backend friction) or Storybook to experiment; land it afterwards.
- Precondition: lay down the 10 rails below, then you can "stay and develop directly" and remain stable.

**The 10 rails to lay down:**
1. **`AGENTS.md` (most important)**: encode conventions, folder meanings, how to run tests, forbidden actions, and a "how to add a feature" step template as machine-readable rules. This is the single biggest lever for agent speed + stability.
2. **Design system as code + Storybook**: build the demo's tokens/components into a library shown in Storybook; Storybook becomes the new visual source of truth (removes the need to go back to the demo).
3. **Visual regression tests** (Chromatic or Playwright screenshot snapshots): accidental visual changes get blocked → stable.
4. **End-to-end typing**: `supabase gen types` for DB types + domain types; a schema change surfaces as compile errors.
5. **Data-access layer as the only seam + contract tests**: all queries go through `services/*.ts`; agents change data only through this seam, limiting blast radius.
6. **Automated RLS policy tests (critical)**: a suite asserting "parent A cannot read parent B's child's scores/photos/messages." Every new feature must pass → privacy never regresses.
7. **Migrations only**: versioned, reversible `supabase/migrations` with seed data; no manual DB edits.
8. **Feature-sliced architecture**: each feature is a self-contained folder (screens/hooks/service usage); changing one feature has minimal blast radius.
9. **Seed data + staging env + e2e (Playwright)**: cover critical flows (login, parent sees only own child, teacher publishes → parent sees live) so changes can be run and seen immediately.
10. **CI gates**: typecheck / lint / unit / RLS tests / e2e smoke / visual regression must all pass before merge. This is what makes "fast changes" also "stable changes."

**One-line conclusion**: after investing in §18, **staying in the production project to develop directly** is the default; the demo becomes an optional sandbox for exploring new "feels," not a mandatory stop for every change.

---

_This document ships together with `docs/product/SPEC.md`, `docs/design/DESIGN.md`, and `demo/index.html`; together they are the authority for implementation. Chinese version: `docs/i18n/開發說明書.md`._
