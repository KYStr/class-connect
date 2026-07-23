-- 0005_teacher_parent_profile_read.sql
-- Allow teachers to read display names of parents who guard students in their class
-- (needed for unread-announcement / incomplete-homework tracking UI).

create policy profiles_teacher_of_guardians on profiles for select
  using (
    exists (
      select 1
      from guardianships g
      join students s on s.id = g.student_id
      where g.parent_id = profiles.id
        and is_teacher_of(s.class_id)
    )
  );
