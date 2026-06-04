-- Сводка с выбором периода: все метрики считаются за окно (days), null = всё время
drop function if exists public.admin_stats();
create or replace function public.admin_stats(days int default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  result json;
  since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  since := case when days is null then '-infinity'::timestamptz
                else now() - make_interval(days => days) end;
  select json_build_object(
    'regs', (select count(*) from auth.users where created_at >= since),
    'active', (select count(*) from auth.users where last_sign_in_at >= since),
    'pro', (select count(*) from auth.users u
            join public.profiles p on p.user_id = u.id and p.plan = 'pro'
            where u.created_at >= since),
    'songs', (select count(*) from public.songs where created_at >= since),
    'total_users', (select count(*) from auth.users),
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
