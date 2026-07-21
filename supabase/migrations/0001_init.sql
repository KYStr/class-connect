-- 0001_init.sql — schema + RLS foundation (DEVELOPMENT.md §5, §6, §7).
-- Migrations are the ONLY way schema changes land (AGENTS.md rail 7). Reversible by dropping.

-- ============================================================
-- Enums (§5.1)
-- ============================================================
create type role_t         as enum ('teacher','parent');
create type event_type_t   as enum ('exam','activity','fee','holiday');
create type leave_type_t   as enum ('sick','personal','late');
create type leave_status_t as enum ('pending','approved','rejected');
create type photo_vis_t    as enum ('class','guardians','private');
create type sender_role_t  as enum ('teacher','parent');

-- ============================================================
-- Core tables (§5.2)
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          role_t not null,
  display_name  text not null,
  locale        text not null default 'zh-Hant',
  created_at    timestamptz not null default now()
);

create table classes (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references profiles(id) on delete cascade,
  name          text not null,
  office_hours  text default 'Weekdays 17:00-20:00',
  created_at    timestamptz not null default now()
);

create table students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  seat       text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (class_id, seat)
);

create table guardianships (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  parent_id  uuid not null references profiles(id) on delete cascade,
  relation   text,
  unique (student_id, parent_id)
);

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

-- ============================================================
-- Feature tables (§5.3)
-- ============================================================
create table announcements (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes(id) on delete cascade,
  author_id    uuid not null references profiles(id),
  title        text not null,
  body         text,
  important    boolean not null default false,
  scheduled_at timestamptz,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create table announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  parent_id       uuid not null references profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, parent_id)
);

create table homework_items (
  id        uuid primary key default gen_random_uuid(),
  class_id  uuid not null references classes(id) on delete cascade,
  due_date  date not null,
  text      text not null,
  note      text,
  created_at timestamptz not null default now()
);
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

create table exams (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  name       text not null,
  published  boolean not null default false,
  show_dist  boolean not null default true,
  created_at timestamptz not null default now()
);
create table scores (
  exam_id    uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score      int check (score between 0 and 100),
  primary key (exam_id, student_id)
);

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
  student_id   uuid references students(id) on delete set null,
  caption      text,
  storage_path text not null,
  visibility   photo_vis_t not null default 'guardians',
  created_at   timestamptz not null default now()
);

create table events (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  title      text not null,
  event_date date not null,
  type       event_type_t not null,
  created_at timestamptz not null default now()
);

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

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (§6.1)
-- ============================================================
create or replace function is_teacher_of(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from classes c where c.id = cid and c.teacher_id = auth.uid());
$$;

create or replace function is_guardian_of(sid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from guardianships g
                where g.student_id = sid and g.parent_id = auth.uid());
$$;

create or replace function is_class_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_teacher_of(cid)
      or exists(select 1 from students s
                join guardianships g on g.student_id = s.id
                where s.class_id = cid and g.parent_id = auth.uid());
$$;

-- ============================================================
-- Auth trigger: auto-create profile (§7.3)
-- ============================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, role, display_name)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.role_t,'parent'),
          coalesce(new.raw_user_meta_data->>'display_name','User'))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Read-stats helper view (§5.4)
-- ============================================================
create view v_announcement_read_stats as
select a.id as announcement_id, a.class_id,
       count(distinct r.parent_id) as read_count,
       (select count(distinct g.parent_id) from students s
          join guardianships g on g.student_id = s.id
        where s.class_id = a.class_id) as guardian_count
from announcements a
left join announcement_reads r on r.announcement_id = a.id
group by a.id;

-- ============================================================
-- Row Level Security (§6.2). Every table on.
-- ============================================================
alter table profiles            enable row level security;
alter table classes             enable row level security;
alter table students            enable row level security;
alter table guardianships       enable row level security;
alter table invites             enable row level security;
alter table announcements       enable row level security;
alter table announcement_reads  enable row level security;
alter table homework_items      enable row level security;
alter table homework_status     enable row level security;
alter table bring_items         enable row level security;
alter table exams               enable row level security;
alter table scores              enable row level security;
alter table performance_notes   enable row level security;
alter table milestones          enable row level security;
alter table photos              enable row level security;
alter table events              enable row level security;
alter table leaves              enable row level security;
alter table consent_forms       enable row level security;
alter table consent_signatures  enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table push_subscriptions  enable row level security;

-- profiles: a user reads/updates own row
create policy profiles_self on profiles for select using ( id = auth.uid() );
create policy profiles_self_upd on profiles for update using ( id = auth.uid() ) with check ( id = auth.uid() );

-- classes / students / guardianships: members read; teacher manages
create policy classes_read on classes for select using ( is_class_member(id) );
create policy classes_teacher on classes for all using ( teacher_id = auth.uid() ) with check ( teacher_id = auth.uid() );
-- Privacy: teachers see the full roster; a parent sees ONLY their own child (never classmates).
create policy students_read on students for select using ( is_teacher_of(class_id) or is_guardian_of(id) );
create policy students_teacher on students for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy guardianships_self on guardianships for select using ( parent_id = auth.uid() or is_teacher_of((select class_id from students s where s.id = student_id)) );

-- class-level content: teacher writes, class reads
create policy ann_read  on announcements for select using ( is_class_member(class_id) );
create policy ann_write on announcements for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy bring_read  on bring_items for select using ( is_class_member(class_id) );
create policy bring_write on bring_items for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy hw_read  on homework_items for select using ( is_class_member(class_id) );
create policy hw_write on homework_items for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy events_read  on events for select using ( is_class_member(class_id) );
create policy events_write on events for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy consent_read  on consent_forms for select using ( is_class_member(class_id) );
create policy consent_write on consent_forms for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy exams_read  on exams for select using ( is_class_member(class_id) );
create policy exams_write on exams for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- read receipts: parent manages own
create policy reads_parent on announcement_reads for all
  using ( parent_id = auth.uid() ) with check ( parent_id = auth.uid() );

-- homework check-off: parent for own child; teacher reads
create policy hw_status_parent on homework_status for all
  using ( is_guardian_of(student_id) ) with check ( is_guardian_of(student_id) );
create policy hw_status_teacher_read on homework_status for select
  using ( exists(select 1 from homework_items h where h.id = homework_id and is_teacher_of(h.class_id)) );

-- scores: teacher manages class; parent reads own child only after publish (SPEC L4)
create policy scores_teacher on scores for all
  using ( exists(select 1 from exams e where e.id = exam_id and is_teacher_of(e.class_id)) )
  with check ( exists(select 1 from exams e where e.id = exam_id and is_teacher_of(e.class_id)) );
create policy scores_parent_read on scores for select
  using ( is_guardian_of(student_id)
          and exists(select 1 from exams e where e.id = exam_id and e.published) );

-- growth (notes / milestones / photos): teacher manages class; parent reads own child
create policy notes_teacher on performance_notes for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy notes_parent_read on performance_notes for select using ( is_guardian_of(student_id) );
create policy ms_teacher on milestones for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy ms_parent_read on milestones for select using ( is_guardian_of(student_id) );
create policy photos_teacher on photos for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );
create policy photos_parent_read on photos for select
  using ( visibility <> 'private' and (student_id is null and is_class_member(class_id) or is_guardian_of(student_id)) );

-- leaves: parent for own child; teacher reviews
create policy leaves_parent on leaves for select using ( is_guardian_of(student_id) );
create policy leaves_parent_insert on leaves for insert with check ( is_guardian_of(student_id) and parent_id = auth.uid() );
create policy leaves_teacher on leaves for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- consent signatures: parent for own child; teacher reads class
create policy consent_sig_parent on consent_signatures for all
  using ( is_guardian_of(student_id) ) with check ( is_guardian_of(student_id) and signed_by = auth.uid() );
create policy consent_sig_teacher_read on consent_signatures for select
  using ( exists(select 1 from consent_forms cf where cf.id = consent_id and is_teacher_of(cf.class_id)) );

-- conversations + messages: homeroom teacher and that student's guardians
create policy conv_access on conversations for all
  using ( is_teacher_of(class_id) or is_guardian_of(student_id) )
  with check ( is_teacher_of(class_id) or is_guardian_of(student_id) );
create policy msg_access on messages for select using (
  exists(select 1 from conversations c where c.id = conversation_id
         and ( is_teacher_of(c.class_id) or is_guardian_of(c.student_id) ))
);
create policy msg_send on messages for insert with check (
  sender_id = auth.uid()
  and exists(select 1 from conversations c where c.id = conversation_id
             and ( is_teacher_of(c.class_id) or is_guardian_of(c.student_id) ))
);

-- invites: teacher of the class manages; redeem happens via security-definer Edge Function
create policy invites_teacher on invites for all using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- push subscriptions: owner only
create policy push_self on push_subscriptions for all
  using ( profile_id = auth.uid() ) with check ( profile_id = auth.uid() );

-- ============================================================
-- Grants — RLS is the gatekeeper, but roles still need table privileges.
-- anon/authenticated are constrained by the policies above; service_role bypasses RLS.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
