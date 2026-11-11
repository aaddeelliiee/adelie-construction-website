begin;

create table if not exists public.finish_questionnaires (
  project_id uuid not null,
  user_id uuid not null,
  contact_email text not null,
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 64000),
  updated_at timestamptz,
  submitted_at timestamptz,
  primary key (project_id, user_id),
  foreign key (project_id, user_id) references public.project_members(project_id, user_id) on delete cascade
);

alter table public.finish_questionnaires enable row level security;
revoke all on public.finish_questionnaires from public, anon, authenticated;
grant select on public.finish_questionnaires to authenticated;
grant all on public.finish_questionnaires to service_role;

drop policy if exists finish_questionnaire_read on public.finish_questionnaires;
create policy finish_questionnaire_read on public.finish_questionnaires for select to authenticated
using (user_id = auth.uid() or public.admin_has_permission('customers'));

create or replace function public.save_finish_questionnaire(
  target_project uuid, new_answers jsonb, submit_answers boolean
) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  submitted timestamptz;
begin
  if submit_answers and nullif(btrim(new_answers->>'overall-style'), '') is null then
    raise exception 'Choose an overall design style before submitting.';
  end if;

  update public.finish_questionnaires
     set answers = new_answers,
         updated_at = now(),
         submitted_at = case when submit_answers then now() end
   where project_id = target_project and user_id = auth.uid()
     and submitted_at is null
   returning submitted_at into submitted;
  if not found then
    raise exception 'This questionnaire is unavailable or has already been submitted.';
  end if;
  return submitted;
end;
$$;
revoke all on function public.save_finish_questionnaire(uuid,jsonb,boolean) from public, anon;
grant execute on function public.save_finish_questionnaire(uuid,jsonb,boolean) to authenticated;

create or replace function public.assign_finish_questionnaire(
  target_project uuid, customer uuid, contact_email text, contact_name text, contact_phone text
) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.profiles(id,email,full_name,phone)
    values (customer,contact_email,contact_name,nullif(contact_phone,''))
    on conflict (id) do update set email=excluded.email, full_name=excluded.full_name, phone=excluded.phone;
  insert into public.project_members(project_id,user_id,role)
    values (target_project,customer,'client')
    on conflict (project_id,user_id) do nothing;
  insert into public.finish_questionnaires(project_id,user_id,contact_email)
    values (target_project,customer,contact_email)
    on conflict (project_id,user_id) do nothing;
end;
$$;
revoke all on function public.assign_finish_questionnaire(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.assign_finish_questionnaire(uuid,uuid,text,text,text) to service_role;

create or replace function public.find_finish_invitee(target_project uuid, contact_email text)
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from auth.users
  where lower(email) = contact_email
    and raw_app_meta_data->>'finish_questionnaire_project' = target_project::text;
$$;
revoke all on function public.find_finish_invitee(uuid,text) from public, anon, authenticated;
grant execute on function public.find_finish_invitee(uuid,text) to service_role;

commit;

