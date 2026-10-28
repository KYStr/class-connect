-- Tag photos to specific students. Only those guardians can see the photo.
-- Private Storage bucket; objects are read via short-lived signed URLs.

create table if not exists photo_students (
  photo_id   uuid not null references photos(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (photo_id, student_id)
);

alter table photo_students enable row level security;

create policy photo_students_teacher on photo_students for all
  using (
    exists (
      select 1 from photos p
      where p.id = photo_id and is_teacher_of(p.class_id)
    )
  )
  with check (
    exists (
      select 1 from photos p
      where p.id = photo_id and is_teacher_of(p.class_id)
    )
  );

create policy photo_students_parent_read on photo_students for select
  using (is_guardian_of(student_id));

drop policy if exists photos_parent_read on photos;
create policy photos_parent_read on photos for select
  using (
    visibility <> 'private'
    and exists (
      select 1 from photo_students ps
      where ps.photo_id = photos.id
        and is_guardian_of(ps.student_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy photos_storage_teacher_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'class'
    and public.is_teacher_of(((storage.foldername(name))[2])::uuid)
  );

create policy photos_storage_teacher_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'class'
    and public.is_teacher_of(((storage.foldername(name))[2])::uuid)
  );

create policy photos_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (
        (storage.foldername(name))[1] = 'class'
        and public.is_teacher_of(((storage.foldername(name))[2])::uuid)
      )
      or exists (
        select 1 from public.photos p
        where p.storage_path = name
          and p.visibility <> 'private'
          and exists (
            select 1 from public.photo_students ps
            where ps.photo_id = p.id
              and public.is_guardian_of(ps.student_id)
          )
      )
    )
  );

do $$
begin
  alter publication supabase_realtime add table photos;
exception
  when duplicate_object then null;
end $$;
