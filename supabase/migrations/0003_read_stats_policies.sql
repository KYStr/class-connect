-- 0003_read_stats_policies.sql — make announcement read-stats safe & usable for teachers.
-- The v_announcement_read_stats view (0001) otherwise runs as owner and could expose other
-- classes' counts. Make it security_invoker so it respects the caller's RLS, and let a
-- teacher read their own class's read receipts (needed to compute "read x / y").

alter view v_announcement_read_stats set (security_invoker = true);

create policy reads_teacher_read on announcement_reads for select
  using ( exists (
    select 1 from announcements a
    where a.id = announcement_id and is_teacher_of(a.class_id)
  ) );
