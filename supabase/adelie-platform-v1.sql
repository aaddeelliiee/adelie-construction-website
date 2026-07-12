-- ADELIE Construction secure homeowner portal
-- Run in Supabase SQL Editor as project owner.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  created_at timestamptz default now()
);
create table if not exists public.portal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  current_phase text default 'Preconstruction',
  status text default 'Active',
  start_date date,
  target_completion_date date,
  progress_percent int default 0 check (progress_percent between 0 and 100),
  project_manager text default 'ADELIE Construction',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'client',
  created_at timestamptz default now(),
  primary key(project_id,user_id)
);
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  title text not null, description text, target_date date, completed_date date, status text default 'Upcoming', sort_order int default 0, created_at timestamptz default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  title text not null, category text, bucket text default 'project-files', storage_path text not null, file_name text, created_at timestamptz default now()
);
create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  caption text, bucket text default 'project-photos', storage_path text not null, taken_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  invoice_number text not null, amount numeric(12,2) default 0, issued_date date, due_date date, status text default 'Open', document_id uuid references public.documents(id) on delete set null, created_at timestamptz default now()
);
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  change_order_number text not null, title text not null, description text, amount numeric(12,2) default 0, schedule_days int default 0, status text default 'Pending', document_id uuid references public.documents(id) on delete set null, created_at timestamptz default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null, sender_role text not null check(sender_role in ('admin','client')), body text not null, created_at timestamptz default now()
);
create table if not exists public.warranty_items (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  title text not null, description text, start_date date, end_date date, status text default 'Active', created_at timestamptz default now()
);

create or replace function public.is_portal_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.portal_admins where user_id=uid)
$$;
grant execute on function public.is_portal_admin(uuid) to authenticated;

create or replace function public.user_has_project(pid uuid, uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_portal_admin(uid) or exists(select 1 from public.project_members where project_id=pid and user_id=uid)
$$;
grant execute on function public.user_has_project(uuid,uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.portal_admins enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;
alter table public.documents enable row level security;
alter table public.project_photos enable row level security;
alter table public.invoices enable row level security;
alter table public.change_orders enable row level security;
alter table public.messages enable row level security;
alter table public.warranty_items enable row level security;

drop policy if exists profiles_self_or_admin on public.profiles;
create policy profiles_self_or_admin on public.profiles for all to authenticated using (id=auth.uid() or public.is_portal_admin()) with check (id=auth.uid() or public.is_portal_admin());
drop policy if exists admins_read_self on public.portal_admins;
create policy admins_read_self on public.portal_admins for select to authenticated using (user_id=auth.uid() or public.is_portal_admin());

drop policy if exists projects_member_read on public.projects;
create policy projects_member_read on public.projects for select to authenticated using (public.user_has_project(id));
drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists members_read on public.project_members;
create policy members_read on public.project_members for select to authenticated using (user_id=auth.uid() or public.is_portal_admin());
drop policy if exists members_admin_write on public.project_members;
create policy members_admin_write on public.project_members for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());

-- Project-linked table policies
DO $$ declare t text; begin
  foreach t in array array['milestones','documents','project_photos','invoices','change_orders','warranty_items'] loop
    execute format('drop policy if exists %I_member_read on public.%I',t,t);
    execute format('create policy %I_member_read on public.%I for select to authenticated using (public.user_has_project(project_id))',t,t);
    execute format('drop policy if exists %I_admin_write on public.%I',t,t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin())',t,t);
  end loop;
end $$;

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages for select to authenticated using (public.user_has_project(project_id));
drop policy if exists messages_member_insert on public.messages;
create policy messages_member_insert on public.messages for insert to authenticated with check (public.user_has_project(project_id) and sender_id=auth.uid());
drop policy if exists messages_admin_update on public.messages;
create policy messages_admin_update on public.messages for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-files','project-files',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-photos','project-photos',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false;

drop policy if exists storage_project_read on storage.objects;
create policy storage_project_read on storage.objects for select to authenticated using (
 bucket_id in ('project-files','project-photos') and public.user_has_project((storage.foldername(name))[1]::uuid)
);
drop policy if exists storage_admin_insert on storage.objects;
create policy storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id in ('project-files','project-photos') and public.is_portal_admin());
drop policy if exists storage_admin_update on storage.objects;
create policy storage_admin_update on storage.objects for update to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin());
drop policy if exists storage_admin_delete on storage.objects;
create policy storage_admin_delete on storage.objects for delete to authenticated using (public.is_portal_admin());

-- Sample project: Vista001 (July 17-August 1, 2026)
do $$ declare pid uuid; begin
  select id into pid from public.projects where name='Vista001' limit 1;
  if pid is null then
    insert into public.projects(name,address,current_phase,status,start_date,target_completion_date,progress_percent,project_manager)
    values('Vista001','1802 Key, Vista, CA','Demolition','Active','2026-07-17','2026-08-01',18,'Agustin Vargas') returning id into pid;
    insert into public.milestones(project_id,title,description,target_date,status,sort_order) values
      (pid,'Site Protection & Demolition','Protect occupied areas, isolate dust, remove approved finishes and debris.','2026-07-19','In Progress',1),
      (pid,'Rough Framing & Trade Corrections','Complete framing adjustments and coordinate plumbing/electrical rough work.','2026-07-23','Upcoming',2),
      (pid,'Inspection & Close-In Approval','Complete required rough inspections before wall finishes.','2026-07-25','Upcoming',3),
      (pid,'Drywall, Finishes & Installation','Patch/finish walls and install approved materials and fixtures.','2026-07-29','Upcoming',4),
      (pid,'Final Walkthrough & Closeout','Punch-list review, final documentation, clean-up and turnover.','2026-08-01','Upcoming',5);
    insert into public.documents(project_id,title,category,bucket,storage_path,file_name) values
      (pid,'Sample Change Order','Change Order','project-files','assets/portal-sample/change-order-vista001.png','ADELIE CHANGE ORDER.png'),
      (pid,'Sample Invoice / Receipt','Invoice','project-files','assets/portal-sample/invoice-vista001.png','ADELIE invoice receipt.png');
    insert into public.invoices(project_id,invoice_number,amount,issued_date,due_date,status) values(pid,'INV-VISTA001-001',0,'2026-07-17','2026-07-17','Sample');
    insert into public.change_orders(project_id,change_order_number,title,description,amount,schedule_days,status) values(pid,'CO-VISTA001-001','Sample Change Order','Demonstration record using the uploaded ADELIE change-order form.',0,0,'Draft');
  end if;
end $$;

-- After creating your admin Auth user, replace the UUID below and run:
-- insert into public.portal_admins(user_id) values ('YOUR-ADMIN-AUTH-USER-UUID') on conflict do nothing;
-- To connect Agustin's client login after the user exists:
-- insert into public.project_members(project_id,user_id,role)
-- select p.id,u.id,'client' from public.projects p cross join auth.users u where p.name='Vista001' and lower(u.email)=lower('agstn.va@gmail.com')
-- on conflict do nothing;


-- ============================================================
-- ADELIE PLATFORM V1 EXPANSION
-- Safe to run after portal-schema.sql. Statements are idempotent.
-- ============================================================

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  log_date date not null default current_date,
  title text not null,
  work_completed text,
  workers_on_site text,
  weather text,
  delays_or_issues text,
  next_steps text,
  visible_to_client boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to text,
  due_date date,
  status text not null default 'Not Started',
  priority text not null default 'Normal',
  visible_to_client boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.material_selections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  item_name text not null,
  manufacturer text,
  model_or_color text,
  allowance numeric(12,2),
  actual_cost numeric(12,2),
  status text not null default 'Pending',
  decision_due_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  inspection_type text not null,
  scheduled_date date,
  completed_date date,
  result text not null default 'Scheduled',
  inspector_or_agency text,
  notes text,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.permits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  permit_type text not null,
  permit_number text,
  jurisdiction text,
  issued_date date,
  expiration_date date,
  status text not null default 'Pending',
  document_id uuid references public.documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) not null default 0,
  payment_date date,
  payment_method text,
  reference_number text,
  status text not null default 'Recorded',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note_date date not null default current_date,
  subject text not null,
  body text not null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_logs_project_date on public.daily_logs(project_id,log_date desc);
create index if not exists idx_project_tasks_project_due on public.project_tasks(project_id,due_date);
create index if not exists idx_selections_project_status on public.material_selections(project_id,status);
create index if not exists idx_inspections_project_date on public.inspections(project_id,scheduled_date);
create index if not exists idx_permits_project_status on public.permits(project_id,status);
create index if not exists idx_payments_project_date on public.payments(project_id,payment_date desc);
create index if not exists idx_crew_notes_project_date on public.crew_notes(project_id,note_date desc);

alter table public.daily_logs enable row level security;
alter table public.project_tasks enable row level security;
alter table public.material_selections enable row level security;
alter table public.inspections enable row level security;
alter table public.permits enable row level security;
alter table public.payments enable row level security;
alter table public.crew_notes enable row level security;

-- Customer-visible operational tables: members read only records intended for them; admins manage all.
drop policy if exists daily_logs_member_read on public.daily_logs;
create policy daily_logs_member_read on public.daily_logs for select to authenticated
using (public.user_has_project(project_id) and (visible_to_client or public.is_portal_admin()));
drop policy if exists daily_logs_admin_write on public.daily_logs;
create policy daily_logs_admin_write on public.daily_logs for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());

drop policy if exists project_tasks_member_read on public.project_tasks;
create policy project_tasks_member_read on public.project_tasks for select to authenticated
using (public.user_has_project(project_id) and (visible_to_client or public.is_portal_admin()));
drop policy if exists project_tasks_admin_write on public.project_tasks;
create policy project_tasks_admin_write on public.project_tasks for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());

DO $$ declare t text; begin
  foreach t in array array['material_selections','inspections','permits','payments'] loop
    execute format('drop policy if exists %I_member_read on public.%I',t,t);
    execute format('create policy %I_member_read on public.%I for select to authenticated using (public.user_has_project(project_id))',t,t);
    execute format('drop policy if exists %I_admin_write on public.%I',t,t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using (public.is_portal_admin()) with check (public.is_portal_admin())',t,t);
  end loop;
end $$;

drop policy if exists crew_notes_admin_only on public.crew_notes;
create policy crew_notes_admin_only on public.crew_notes for all to authenticated
using (public.is_portal_admin()) with check (public.is_portal_admin());

-- Keep private file storage organized by project UUID as the first folder segment.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-files','project-files',false,26214400,array[
'application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif',
'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-photos','project-photos',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Seed expanded Vista001 data once.
do $$ declare pid uuid; begin
  select id into pid from public.projects where name='Vista001' limit 1;
  if pid is not null then
    if not exists(select 1 from public.daily_logs where project_id=pid) then
      insert into public.daily_logs(project_id,log_date,title,work_completed,workers_on_site,weather,next_steps,visible_to_client)
      values(pid,'2026-07-17','Demolition mobilization','Installed floor and dust protection, established debris route, and began approved demolition.','ADELIE field team','Clear','Continue selective demolition and prepare rough-opening verification.',true);
    end if;
    if not exists(select 1 from public.project_tasks where project_id=pid) then
      insert into public.project_tasks(project_id,title,description,due_date,status,priority,visible_to_client,sort_order) values
      (pid,'Complete selective demolition','Remove approved finishes while protecting retained work.','2026-07-19','In Progress','High',true,1),
      (pid,'Verify rough dimensions','Confirm field conditions before trade rough-in.','2026-07-20','Not Started','High',true,2),
      (pid,'Schedule rough inspection','Coordinate inspection after framing and MEP rough work.','2026-07-24','Not Started','Normal',true,3);
    end if;
    if not exists(select 1 from public.material_selections where project_id=pid) then
      insert into public.material_selections(project_id,category,item_name,status,decision_due_date,notes) values
      (pid,'Finish','Wall paint color','Pending','2026-07-22','Client selection required before finish schedule is finalized.'),
      (pid,'Fixture','Primary light fixture','Pending','2026-07-23','Confirm fixture dimensions and lead time.');
    end if;
    if not exists(select 1 from public.inspections where project_id=pid) then
      insert into public.inspections(project_id,inspection_type,scheduled_date,result,inspector_or_agency,notes)
      values(pid,'Rough framing / MEP','2026-07-25','Scheduled','Local building department','Subject to completion of all rough work.');
    end if;
    if not exists(select 1 from public.permits where project_id=pid) then
      insert into public.permits(project_id,permit_type,jurisdiction,status,notes)
      values(pid,'Remodel permit','City of Vista','Pending','Sample portal record; replace with actual permit details.');
    end if;
  end if;
end $$;

-- Verification query: after running this file, all rows should show RLS enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('profiles','portal_admins','projects','project_members','milestones','documents','project_photos','invoices','change_orders','messages','warranty_items','daily_logs','project_tasks','material_selections','inspections','permits','payments','crew_notes')
order by tablename;
