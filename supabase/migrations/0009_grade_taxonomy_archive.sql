-- 0009_grade_taxonomy_archive.sql — subjects, exam types, exam archive (teacher grades UX).

create table grade_subjects (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table exam_types (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

alter table exams
  add column if not exists subject_id uuid references grade_subjects(id) on delete set null,
  add column if not exists exam_type_id uuid references exam_types(id) on delete set null,
  add column if not exists archived_at timestamptz;

create index if not exists exams_class_active_idx
  on exams (class_id, created_at desc)
  where archived_at is null;

-- Seed default exam types for a class.
create or replace function seed_exam_types(cid uuid)
returns void language sql security definer set search_path = public as $$
  insert into exam_types (class_id, name, sort_order) values
    (cid, '段考', 1),
    (cid, '小考', 2),
    (cid, '隨堂考', 3)
  on conflict (class_id, name) do nothing;
$$;

create or replace function on_class_seed_exam_types() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_exam_types(new.id);
  return new;
end; $$;

drop trigger if exists trg_exam_types on classes;
create trigger trg_exam_types after insert on classes
  for each row execute function on_class_seed_exam_types();

-- Backfill existing classes.
select seed_exam_types(c.id) from classes c;

alter table grade_subjects enable row level security;
alter table exam_types enable row level security;

create policy gs_read on grade_subjects for select using ( is_class_member(class_id) );
create policy gs_write on grade_subjects for all
  using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

create policy et_read on exam_types for select using ( is_class_member(class_id) );
create policy et_write on exam_types for all
  using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- Parents only see non-archived published exams (tighten via policy replace is heavy;
-- app filters archived; add explicit parent-facing filter helper policy note).
-- Keep exams_read as is_class_member; services filter archived_at is null for active lists.

grant all on grade_subjects to anon, authenticated, service_role;
grant all on exam_types to anon, authenticated, service_role;
