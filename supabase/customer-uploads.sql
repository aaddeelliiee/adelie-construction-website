-- ADELIE customer uploads
-- Safe to run more than once in Supabase SQL Editor.

alter table public.documents add column if not exists notes text;
alter table public.documents add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.documents add column if not exists uploaded_role text not null default 'admin';

alter table public.project_photos add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.project_photos add column if not exists uploaded_role text not null default 'admin';

drop policy if exists documents_client_insert on public.documents;
create policy documents_client_insert on public.documents
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and uploaded_role = 'client'
  and exists (
    select 1 from public.project_members
    where project_id = documents.project_id
      and user_id = auth.uid()
      and role = 'client'
  )
);

drop policy if exists project_photos_client_insert on public.project_photos;
create policy project_photos_client_insert on public.project_photos
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and uploaded_role = 'client'
  and exists (
    select 1 from public.project_members
    where project_id = project_photos.project_id
      and user_id = auth.uid()
      and role = 'client'
  )
);

drop policy if exists storage_client_insert on storage.objects;
create policy storage_client_insert on storage.objects
for insert to authenticated
with check (
  bucket_id in ('project-files','project-photos')
  and exists (
    select 1 from public.project_members
    where project_id = (storage.foldername(name))[1]::uuid
      and user_id = auth.uid()
      and role = 'client'
  )
);

drop policy if exists documents_client_delete on public.documents;
create policy documents_client_delete on public.documents
for delete to authenticated
using (uploaded_by = auth.uid() and uploaded_role = 'client');

drop policy if exists project_photos_client_delete on public.project_photos;
create policy project_photos_client_delete on public.project_photos
for delete to authenticated
using (uploaded_by = auth.uid() and uploaded_role = 'client');

drop policy if exists storage_client_delete on storage.objects;
create policy storage_client_delete on storage.objects
for delete to authenticated
using (
  bucket_id in ('project-files','project-photos')
  and (storage.foldername(name))[2] = 'customer'
  and (storage.foldername(name))[3]::uuid = auth.uid()
);
