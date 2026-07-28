-- Enable Realtime for messaging + other live tables (SPEC L12).
-- Without this, postgres_changes subscriptions never fire.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table announcement_reads;
alter publication supabase_realtime add table homework_items;
alter publication supabase_realtime add table homework_status;
alter publication supabase_realtime add table bring_items;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table leaves;
alter publication supabase_realtime add table consent_forms;
alter publication supabase_realtime add table consent_signatures;
