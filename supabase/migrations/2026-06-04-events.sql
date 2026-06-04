-- Аналитика воронки: события продукта

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  props jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists events_name_time_idx on public.events (name, created_at);

alter table public.events enable row level security;
-- писать может любой (в т.ч. гость = anon); читать — только админ
drop policy if exists "events_insert_auth" on public.events;
create policy "events_insert_auth" on public.events
  for insert to authenticated with check (true);
drop policy if exists "events_insert_anon" on public.events;
create policy "events_insert_anon" on public.events
  for insert to anon with check (user_id is null);
drop policy if exists "events_admin_read" on public.events;
create policy "events_admin_read" on public.events
  for select to authenticated using (public.is_admin());

-- Сводка по событиям за период (для админки)
create or replace function public.admin_events(days int default 7)
returns table (name text, n bigint, users bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select e.name, count(*)::bigint, count(distinct e.user_id)::bigint
  from public.events e
  where e.created_at >= now() - make_interval(days => days)
  group by e.name
  order by count(*) desc;
end;
$$;
