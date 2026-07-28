-- Allow conversation participants to mark messages as read (SPEC L8).
create policy msg_update_read on messages for update
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (is_teacher_of(c.class_id) or is_guardian_of(c.student_id))
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (is_teacher_of(c.class_id) or is_guardian_of(c.student_id))
    )
  );
