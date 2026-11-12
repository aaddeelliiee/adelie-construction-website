begin;
create table if not exists public.remodel_estimates (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'customer', name text not null,
  pricing_version text not null, inputs jsonb not null default '{}'::jsonb, checkboxes jsonb not null default '{}'::jsonb,
  estimate_low numeric not null, estimate_high numeric not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.remodel_estimates enable row level security;
revoke all on public.remodel_estimates from public, anon;
grant select,insert,update,delete on public.remodel_estimates to authenticated;
drop policy if exists estimator_owner_access on public.remodel_estimates;
create policy estimator_owner_access on public.remodel_estimates for all to authenticated using (user_id=auth.uid() or public.is_portal_admin(auth.uid())) with check (user_id=auth.uid() or public.is_portal_admin(auth.uid()));
create index if not exists remodel_estimates_user_idx on public.remodel_estimates(user_id,updated_at desc);
commit;
