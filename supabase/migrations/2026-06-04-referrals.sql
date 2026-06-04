-- Реферальная система: код у каждого, кто кого пригласил

alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references auth.users (id) on delete set null;

-- код = первые 8 символов uuid без дефисов
update public.profiles
set referral_code = substr(replace(user_id::text, '-', ''), 1, 8)
where referral_code is null;

-- автозаведение профиля теперь сразу с кодом
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, referral_code)
  values (new.id, new.email, substr(replace(new.id::text, '-', ''), 1, 8))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- привязка приглашённого к пригласившему (один раз, не сам себя)
create or replace function public.apply_referral(code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare inviter uuid;
begin
  if auth.uid() is null then return false; end if;
  select user_id into inviter from public.profiles where referral_code = code;
  if inviter is null or inviter = auth.uid() then return false; end if;
  update public.profiles
  set referred_by = inviter
  where user_id = auth.uid() and referred_by is null;
  return found;
end;
$$;

-- admin_users: + сколько пригласил
drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table (
  user_id uuid, email text, plan text,
  created_at timestamptz, last_sign_in_at timestamptz,
  songs_count bigint, invited_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select u.id, u.email::text, coalesce(p.plan, 'pro'),
         u.created_at, u.last_sign_in_at,
         (select count(*) from public.user_songs us where us.user_id = u.id),
         (select count(*) from public.profiles p2 where p2.referred_by = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;
