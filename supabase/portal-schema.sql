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
