-- Анкета пользователя: имя, город, о себе
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists about text;

-- При регистрации берём имя из метаданных
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, referral_code, name)
  values (
    new.id,
    new.email,
    substr(replace(new.id::text, '-', ''), 1, 8),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Безопасное обновление только полей анкеты (тариф не трогается)
create or replace function public.update_my_profile(p_name text, p_city text, p_about text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.profiles
  set name = nullif(trim(p_name), ''),
      city = nullif(trim(p_city), ''),
      about = nullif(trim(p_about), ''),
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

-- Своя анкета: чтение
create or replace function public.my_profile()
returns table (name text, city text, about text, email text, referral_code text, plan text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  return query
  select p.name, p.city, p.about, p.email, p.referral_code, p.plan
  from public.profiles p where p.user_id = auth.uid();
end;
$$;
