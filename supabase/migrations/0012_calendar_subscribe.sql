-- Class-wide default reminder, plus a per-parent calendar subscription token.
alter table classes
  add column if not exists remind_day text not null default 'same',
  add column if not exists remind_time text not null default '07:00';

alter table classes drop constraint if exists classes_remind_day_check;
alter table classes
  add constraint classes_remind_day_check check (remind_day in ('same', 'prev', 'none'));

create table if not exists calendar_subs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  token       text not null unique,
  remind_day  text not null default 'class',
  remind_time text not null default '07:00',
  created_at  timestamptz not null default now(),
  unique (profile_id, class_id),
  constraint calendar_subs_day_check check (remind_day in ('class', 'same', 'prev', 'none'))
);

alter table calendar_subs enable row level security;

create policy calendar_subs_own on calendar_subs
  for all
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from guardianships g
      join students s on s.id = g.student_id
      where g.parent_id = auth.uid()
        and s.class_id = calendar_subs.class_id
    )
  );
