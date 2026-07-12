-- ADELIE employee portal migration
-- Run once in Supabase SQL Editor after the existing portal migrations.

create table if not exists public.employees (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  job_title text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_project_assignments (
  employee_id uuid not null references public.employees(user_id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (employee_id, project_id)
);

create table if not exists public.employee_schedule (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(user_id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  details text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'Scheduled',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.employee_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(user_id) on delete cascade,
  body text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  check (recipient_id is null or recipient_id <> sender_id)
);

create index if not exists employee_assignments_project_idx on public.employee_project_assignments(project_id);
create index if not exists employee_schedule_employee_starts_idx on public.employee_schedule(employee_id, starts_at);
create index if not exists internal_messages_recipient_created_idx on public.internal_messages(recipient_id, created_at desc);

create or replace function public.is_employee(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.employees where user_id = check_user and active); $$;

create or replace function public.employee_has_project(check_project uuid, check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.employee_project_assignments where employee_id = check_user and project_id = check_project); $$;

grant execute on function public.is_employee(uuid) to authenticated;
grant execute on function public.employee_has_project(uuid,uuid) to authenticated;

create or replace function public.employee_directory()
returns table(user_id uuid, full_name text)
language sql stable security definer set search_path = public
as $$
  select e.user_id, e.full_name from public.employees e
  where e.active and (public.is_employee() or public.is_portal_admin())
  order by e.full_name;
$$;
grant execute on function public.employee_directory() to authenticated;

alter table public.employees enable row level security;
alter table public.employee_project_assignments enable row level security;
alter table public.employee_schedule enable row level security;
alter table public.employee_notes enable row level security;
alter table public.internal_messages enable row level security;

drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists employees_self_read on public.employees;
create policy employees_self_read on public.employees for select to authenticated using (user_id = auth.uid() and active);

drop policy if exists employee_assignments_admin_all on public.employee_project_assignments;
create policy employee_assignments_admin_all on public.employee_project_assignments for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists employee_assignments_self_read on public.employee_project_assignments;
create policy employee_assignments_self_read on public.employee_project_assignments for select to authenticated using (employee_id = auth.uid());

drop policy if exists employee_schedule_admin_all on public.employee_schedule;
create policy employee_schedule_admin_all on public.employee_schedule for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists employee_schedule_self_read on public.employee_schedule;
create policy employee_schedule_self_read on public.employee_schedule for select to authenticated using (employee_id = auth.uid());

-- Notes are deliberately admin-only. Employees and customers receive no policy.
drop policy if exists employee_notes_admin_all on public.employee_notes;
create policy employee_notes_admin_all on public.employee_notes for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists internal_messages_admin_all on public.internal_messages;
create policy internal_messages_admin_all on public.internal_messages for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists internal_messages_employee_read on public.internal_messages;
create policy internal_messages_employee_read on public.internal_messages for select to authenticated
using (public.is_employee() and (sender_id = auth.uid() or recipient_id = auth.uid() or recipient_id is null));
drop policy if exists internal_messages_employee_insert on public.internal_messages;
create policy internal_messages_employee_insert on public.internal_messages for insert to authenticated
with check (
  public.is_employee() and sender_id = auth.uid()
  and (recipient_id is null or public.is_employee(recipient_id) or public.is_portal_admin(recipient_id))
);

-- Employees can read assigned projects and their customer-facing boards, but cannot insert/update/delete them.
drop policy if exists projects_employee_read on public.projects;
create policy projects_employee_read on public.projects for select to authenticated using (public.employee_has_project(id));
drop policy if exists milestones_employee_read on public.milestones;
create policy milestones_employee_read on public.milestones for select to authenticated using (public.employee_has_project(project_id));
drop policy if exists messages_employee_read on public.messages;
create policy messages_employee_read on public.messages for select to authenticated using (public.employee_has_project(project_id));
drop policy if exists documents_employee_read on public.documents;
create policy documents_employee_read on public.documents for select to authenticated using (public.employee_has_project(project_id));
drop policy if exists project_photos_employee_read on public.project_photos;
create policy project_photos_employee_read on public.project_photos for select to authenticated using (public.employee_has_project(project_id));

-- Existing storage SELECT policies may differ by portal version; this adds read-only assigned-project access.
drop policy if exists storage_employee_project_read on storage.objects;
create policy storage_employee_project_read on storage.objects for select to authenticated
using (bucket_id in ('project-files','project-photos') and public.employee_has_project((storage.foldername(name))[1]::uuid));
