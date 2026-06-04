-- Серверные функции для админ-панели: статистика и карточки пользователей.
-- security definer + явная проверка админской почты внутри каждой функции.

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select (auth.jwt() ->> 'email') in ('human.artem26@gmail.com', 'human.artem@icloud.com');
$$;

-- Список пользователей: почта, дата регистрации, последний вход, тариф, число песен
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
  select u.id, u.email, coalesce(p.plan, 'pro'),
         u.created_at, u.last_sign_in_at,
         (select count(*) from public.user_songs us where us.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- Песни конкретного пользователя
create or replace function public.admin_user_songs(target uuid)
returns table (id uuid, title text, artist text, learned boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
  select s.id, s.title, s.artist, us.learned
  from public.user_songs us
  join public.songs s on s.id = us.song_id
  where us.user_id = target
  order by us.added_at desc;
end;
$$;

-- Общая статистика и регистрации по дням (за 30 дней)
create or replace function public.admin_stats()
returns json
language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select json_build_object(
    'total_users', (select count(*) from auth.users),
    'today', (select count(*) from auth.users where created_at::date = current_date),
    'week', (select count(*) from auth.users where created_at >= current_date - 6),
    'active_week', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'pro_users', (select count(*) from public.profiles where plan = 'pro'),
    'total_songs', (select count(*) from public.songs),
    'by_day', (
      select coalesce(json_agg(row_to_json(d) order by d.day), '[]'::json)
      from (
        select created_at::date as day, count(*) as n
        from auth.users
        where created_at >= current_date - 13
        group by created_at::date
      ) d
    )
  ) into result;
  return result;
end;
$$;
