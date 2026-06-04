-- Сводка: прирост пользователей за день/неделю/месяц/год
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
    'month', (select count(*) from auth.users where created_at >= current_date - 29),
    'year', (select count(*) from auth.users where created_at >= current_date - 364),
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
