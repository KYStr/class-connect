-- 0002_feature_gating.sql — progressive feature gating (SPEC L16, DEVELOPMENT.md §5.5).
-- A new class shows only the core-3 features; the teacher opts into the rest.

-- Per-class feature switches.
create table class_features (
  class_id   uuid not null references classes(id) on delete cascade,
  feature    text not null,   -- announcements|contact|messages|grades|growth|calendar|leave|consent
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (class_id, feature)
);

-- Seed the full switch set for a class: core-3 on, the rest off.
create or replace function seed_class_features(cid uuid)
returns void language sql security definer set search_path = public as $$
  insert into class_features (class_id, feature, enabled) values
    (cid, 'announcements', true),
    (cid, 'contact',       true),
    (cid, 'messages',      true),
    (cid, 'grades',        false),
    (cid, 'growth',        false),
    (cid, 'calendar',      false),
    (cid, 'leave',         false),
    (cid, 'consent',       false)
  on conflict (class_id, feature) do nothing;
$$;

-- Auto-seed switches whenever a class is created.
create or replace function on_class_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_class_features(new.id);
  return new;
end; $$;
create trigger trg_class_features after insert on classes
  for each row execute function on_class_created();

-- Backfill any classes that already exist.
select seed_class_features(c.id) from classes c;

-- RLS: any class member reads (parents render tabs from these); teacher of the class manages.
alter table class_features enable row level security;
create policy cf_read   on class_features for select using ( is_class_member(class_id) );
create policy cf_manage on class_features for all
  using ( is_teacher_of(class_id) ) with check ( is_teacher_of(class_id) );

-- Explicit grants (blanket grants exist from 0001, kept here for clarity on the new table).
grant all on class_features to anon, authenticated, service_role;
