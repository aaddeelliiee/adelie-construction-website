-- ADELIE employee photo and note approval workflow
-- Run once in Supabase SQL Editor after employee-portal.sql and customer-uploads.sql.
-- Safe to run more than once.

alter table public.project_photos add column if not exists approval_status text not null default 'approved';
alter table public.project_photos add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.project_photos add column if not exists reviewed_at timestamptz;
alter table public.project_photos add column if not exists review_note text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_photos_approval_status_check') then
    alter table public.project_photos add constraint project_photos_approval_status_check
      check (approval_status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists project_photos_approval_queue_idx
  on public.project_photos(project_id, approval_status, created_at desc);

-- Customers can see approved photos and their own uploads, but never pending employee updates.
drop policy if exists project_photos_member_read on public.project_photos;
create policy project_photos_member_read on public.project_photos for select to authenticated
using (
  public.user_has_project(project_id)
  and (approval_status = 'approved' or uploaded_by = auth.uid())
);

drop policy if exists project_photos_employee_insert on public.project_photos;
create policy project_photos_employee_insert on public.project_photos for insert to authenticated
with check (
  public.is_employee()
  and public.employee_has_project(project_id)
  and uploaded_by = auth.uid()
  and uploaded_role = 'employee'
  and approval_status = 'pending'
);

drop policy if exists project_photos_employee_update on public.project_photos;
create policy project_photos_employee_update on public.project_photos for update to authenticated
using (uploaded_by = auth.uid() and uploaded_role = 'employee' and approval_status = 'pending')
with check (uploaded_by = auth.uid() and uploaded_role = 'employee' and approval_status = 'pending');

drop policy if exists project_photos_employee_delete on public.project_photos;
create policy project_photos_employee_delete on public.project_photos for delete to authenticated
using (uploaded_by = auth.uid() and uploaded_role = 'employee' and approval_status <> 'approved');

drop policy if exists storage_employee_photo_insert on storage.objects;
create policy storage_employee_photo_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[2] = 'employee'
  and (storage.foldername(name))[3]::uuid = auth.uid()
  and public.employee_has_project((storage.foldername(name))[1]::uuid)
);

-- Replace the broad member storage rule so signed URLs also respect approval status.
drop policy if exists storage_project_read on storage.objects;
create policy storage_project_read on storage.objects for select to authenticated
using (
  (bucket_id = 'project-files' and public.user_has_project((storage.foldername(name))[1]::uuid))
  or
  (bucket_id = 'project-photos' and public.user_has_project((storage.foldername(name))[1]::uuid) and exists (
    select 1 from public.project_photos photo
    where photo.storage_path = name
      and (photo.approval_status = 'approved' or photo.uploaded_by = auth.uid())
  ))
);

drop policy if exists storage_employee_photo_delete on storage.objects;
create policy storage_employee_photo_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[2] = 'employee'
  and (storage.foldername(name))[3]::uuid = auth.uid()
  and exists (
    select 1 from public.project_photos photo
    where photo.storage_path = name and photo.uploaded_by = auth.uid() and photo.approval_status <> 'approved'
  )
);
