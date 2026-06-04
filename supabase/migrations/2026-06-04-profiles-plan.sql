-- Миграция: профили пользователей с тарифом (free | pro).
-- Только добавляет — данные не трогает.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Свой профиль читает каждый; админы видят и меняют всех
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (auth.jwt() ->> 'email') in ('human.artem26@gmail.com', 'human.artem@icloud.com')
  );
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('human.artem26@gmail.com', 'human.artem@icloud.com'));

-- Автозаведение профиля при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Профили для уже существующих пользователей
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;
