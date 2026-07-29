-- 0008_onboarding.sql — per-user tour / point-out memory (SPEC L17, DEVELOPMENT.md §5.5).

create table onboarding_state (
  profile_id uuid primary key references profiles(id) on delete cascade,
  seen       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table onboarding_state enable row level security;

create policy ob_self on onboarding_state for all
  using ( profile_id = auth.uid() )
  with check ( profile_id = auth.uid() );

grant all on onboarding_state to anon, authenticated, service_role;
