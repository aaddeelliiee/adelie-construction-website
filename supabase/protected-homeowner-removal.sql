begin;

alter table public.customer_onboarding
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

create index if not exists customer_onboarding_archived_at_idx
  on public.customer_onboarding (archived_at, created_at desc);

commit;
