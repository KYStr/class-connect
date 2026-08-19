-- Multi-guardian family invites: codes stay reusable until revoked/expired.
alter table invites
  add column if not exists revoked_at timestamptz;

create index if not exists invites_student_active_idx
  on invites (student_id)
  where revoked_at is null;
