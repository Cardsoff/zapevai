-- Фикс безопасности: is_admin() возвращал NULL для анонима,
-- из-за чего проверка «if not is_admin()» не срабатывала.
-- Плюс приведение email к text в admin_users.

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(
    (auth.jwt() ->> 'email') in ('human.artem26@gmail.com', 'human.artem@icloud.com'),
    false
  );
$$;

create or replace function public.admin_users()
returns table (
  user_id uuid,
  email text,
  plan text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  songs_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
  select u.id, u.email::text, coalesce(p.plan, 'pro'),
         u.created_at, u.last_sign_in_at,
         (select count(*) from public.user_songs us where us.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;
