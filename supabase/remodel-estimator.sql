begin;
create table if not exists public.remodel_estimates (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'customer', name text not null,
  customer_name text, customer_email text,
  pricing_version text not null, inputs jsonb not null default '{}'::jsonb, checkboxes jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  is_draft boolean not null default false,
  estimate_low numeric not null, estimate_high numeric not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.remodel_estimates add column if not exists customer_name text;
alter table public.remodel_estimates add column if not exists customer_email text;
alter table public.remodel_estimates add column if not exists summary jsonb not null default '{}'::jsonb;
alter table public.remodel_estimates add column if not exists is_draft boolean not null default false;
alter table public.remodel_estimates add column if not exists customer_deleted boolean not null default false;
alter table public.remodel_estimates enable row level security;
revoke all on public.remodel_estimates from public, anon;
grant select,insert,update,delete on public.remodel_estimates to authenticated;
drop policy if exists estimator_owner_access on public.remodel_estimates;
create policy estimator_owner_access on public.remodel_estimates for all to authenticated using (user_id=auth.uid() or public.is_portal_admin(auth.uid())) with check (user_id=auth.uid() or public.is_portal_admin(auth.uid()));
drop policy if exists estimator_assigned_employee_read on public.remodel_estimates;
create policy estimator_assigned_employee_read on public.remodel_estimates for select to authenticated using (
  project_id is not null and exists(select 1 from public.employee_project_assignments a where a.project_id=remodel_estimates.project_id and a.employee_id=auth.uid())
);
create index if not exists remodel_estimates_user_idx on public.remodel_estimates(user_id,updated_at desc);
create unique index if not exists remodel_estimates_active_draft_idx on public.remodel_estimates(user_id) where is_draft;
commit;
