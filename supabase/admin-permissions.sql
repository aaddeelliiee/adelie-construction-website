-- ADELIE administrator roles and permissions
-- Run once in Supabase SQL Editor. Safe to run more than once.

alter table public.portal_admins add column if not exists full_name text;
alter table public.portal_admins add column if not exists is_owner boolean not null default false;
alter table public.portal_admins add column if not exists permissions text[] not null default array[]::text[];

-- Preserve full access for every existing administrator.
update public.portal_admins set permissions=array['*'] where cardinality(permissions)=0;

-- Protect exactly one owner. On the first run, the oldest administrator becomes owner.
do $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.portal_admins where is_owner order by created_at limit 1;
  if owner_id is null then
    select user_id into owner_id from public.portal_admins order by created_at limit 1;
    if owner_id is not null then update public.portal_admins set is_owner=true where user_id=owner_id; end if;
  end if;
end $$;

create unique index if not exists portal_admins_single_owner_idx
  on public.portal_admins ((is_owner)) where is_owner;

create or replace function public.is_portal_user(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.portal_admins where user_id=check_user); $$;

-- Kept for legacy policies: only the protected owner passes unrestricted admin checks.
create or replace function public.is_portal_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.portal_admins where user_id=check_user and is_owner); $$;

create or replace function public.admin_has_permission(required_permission text, check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.portal_admins
    where user_id=check_user
      and (is_owner or '*'=any(permissions) or required_permission=any(permissions))
  );
$$;

create or replace function public.user_has_project(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_portal_user(uid)
    or exists(select 1 from public.project_members where project_id=pid and user_id=uid);
$$;

grant execute on function public.is_portal_user(uuid) to authenticated;
grant execute on function public.admin_has_permission(text,uuid) to authenticated;

-- Every administrator may read their own role. Only the owner may read all roles.
drop policy if exists admins_read_self on public.portal_admins;
create policy admins_read_self on public.portal_admins for select to authenticated
using (user_id=auth.uid() or public.is_portal_admin());

-- Project configuration.
drop policy if exists projects_capability_write on public.projects;
create policy projects_capability_write on public.projects for all to authenticated
using (public.admin_has_permission('projects')) with check (public.admin_has_permission('projects'));

-- Customer membership linking.
drop policy if exists members_capability_write on public.project_members;
create policy members_capability_write on public.project_members for all to authenticated
using (public.admin_has_permission('customers')) with check (public.admin_has_permission('customers'));

-- Customer-facing schedules, files, photos, financial items, messages, and warranties.
do $$ declare table_name text; begin
  foreach table_name in array array['milestones','documents','project_photos','invoices','change_orders','warranty_items'] loop
    execute format('drop policy if exists %I_capability_write on public.%I',table_name,table_name);
    execute format('create policy %I_capability_write on public.%I for all to authenticated using (public.admin_has_permission(''content'')) with check (public.admin_has_permission(''content''))',table_name,table_name);
  end loop;
end $$;

drop policy if exists messages_capability_write on public.messages;
create policy messages_capability_write on public.messages for all to authenticated
using (public.admin_has_permission('content')) with check (public.admin_has_permission('content'));

-- Internal project operations.
do $$ declare table_name text; begin
  foreach table_name in array array['daily_logs','project_tasks','material_selections','inspections','permits','payments','crew_notes'] loop
    execute format('drop policy if exists %I_capability_write on public.%I',table_name,table_name);
    execute format('create policy %I_capability_write on public.%I for all to authenticated using (public.admin_has_permission(''projects'')) with check (public.admin_has_permission(''projects''))',table_name,table_name);
  end loop;
end $$;

-- Employee accounts, assignments, schedules, private notes, and team chat.
do $$ declare table_name text; begin
  foreach table_name in array array['employees','employee_project_assignments','employee_schedule','employee_notes','internal_messages'] loop
    execute format('drop policy if exists %I_capability_write on public.%I',table_name,table_name);
    execute format('create policy %I_capability_write on public.%I for all to authenticated using (public.admin_has_permission(''employees'')) with check (public.admin_has_permission(''employees''))',table_name,table_name);
  end loop;
end $$;

-- Project file and photo storage.
drop policy if exists storage_capability_insert on storage.objects;
create policy storage_capability_insert on storage.objects for insert to authenticated
with check (bucket_id in ('project-files','project-photos') and public.admin_has_permission('content'));
drop policy if exists storage_capability_update on storage.objects;
create policy storage_capability_update on storage.objects for update to authenticated
using (public.admin_has_permission('content')) with check (public.admin_has_permission('content'));
drop policy if exists storage_capability_delete on storage.objects;
create policy storage_capability_delete on storage.objects for delete to authenticated
using (public.admin_has_permission('content') or public.admin_has_permission('projects'));
