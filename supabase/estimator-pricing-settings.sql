begin;
create table if not exists public.estimator_pricing_settings (
  id integer primary key default 1 check (id=1),
  pricing jsonb not null default '{}'::jsonb,
  labor_position numeric not null default 0 check (labor_position between -40 and 40),
  range_width numeric not null default 15000 check (range_width between 2500 and 100000),
  version text not null default 'owner-default',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.estimator_pricing_settings enable row level security;
revoke all on public.estimator_pricing_settings from public, anon;
grant select on public.estimator_pricing_settings to authenticated;
grant insert,update on public.estimator_pricing_settings to authenticated;
drop policy if exists estimator_settings_read on public.estimator_pricing_settings;
create policy estimator_settings_read on public.estimator_pricing_settings for select to authenticated using (true);
drop policy if exists estimator_settings_owner_insert on public.estimator_pricing_settings;
create policy estimator_settings_owner_insert on public.estimator_pricing_settings for insert to authenticated with check (public.is_portal_admin(auth.uid()));
drop policy if exists estimator_settings_owner_update on public.estimator_pricing_settings;
create policy estimator_settings_owner_update on public.estimator_pricing_settings for update to authenticated using (public.is_portal_admin(auth.uid())) with check (public.is_portal_admin(auth.uid()));
insert into public.estimator_pricing_settings(id) values(1) on conflict(id) do nothing;
commit;
