begin;

create table if not exists public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  address text not null,
  created_by uuid not null references auth.users(id),
  discovery jsonb not null default '{}'::jsonb,
  design_answers jsonb not null default '{}'::jsonb,
  enabled_forms text[] not null default array['discovery','design']::text[],
  completed_forms text[] not null default array[]::text[],
  stage text not null default 'new' check (stage in ('new','discovery','planning','proposal','contract','active','complete')),
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_onboarding enable row level security;
revoke all on public.customer_onboarding from public, anon;
grant select on public.customer_onboarding to authenticated;
grant all on public.customer_onboarding to service_role;

drop policy if exists onboarding_customer_read on public.customer_onboarding;
create policy onboarding_customer_read on public.customer_onboarding for select to authenticated
  using (user_id = auth.uid() or public.is_portal_admin(auth.uid()));

create or replace function public.save_customer_onboarding(
  onboarding_id uuid,
  discovery_answers jsonb default null,
  finish_answers jsonb default null,
  completed text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.customer_onboarding
  set discovery = coalesce(discovery_answers, discovery),
      design_answers = coalesce(finish_answers, design_answers),
      completed_forms = case when completed is null or completed = any(completed_forms)
        then completed_forms else array_append(completed_forms, completed) end,
      stage = case when completed = 'discovery' and stage = 'new' then 'discovery' else stage end,
      updated_at = now()
  where id = onboarding_id and user_id = auth.uid();
  if not found then raise exception 'This onboarding record is unavailable.'; end if;
end;
$$;
revoke all on function public.save_customer_onboarding(uuid,jsonb,jsonb,text) from public, anon;
grant execute on function public.save_customer_onboarding(uuid,jsonb,jsonb,text) to authenticated;

commit;
