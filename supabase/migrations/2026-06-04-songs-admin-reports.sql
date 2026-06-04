-- Замечания к песням + админ-функции базы песен

create table if not exists public.song_reports (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  comment text not null,
  created_at timestamptz default now()
);
alter table public.song_reports enable row level security;
drop policy if exists "reports_insert" on public.song_reports;
create policy "reports_insert" on public.song_reports
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reports_admin_read" on public.song_reports;
create policy "reports_admin_read" on public.song_reports
  for select to authenticated using (public.is_admin());
drop policy if exists "reports_admin_delete" on public.song_reports;
create policy "reports_admin_delete" on public.song_reports
  for delete to authenticated using (public.is_admin());

-- Список песен для админки: с числом пользователей и замечаний
create or replace function public.admin_songs()
returns table (
  id uuid, title text, artist text, created_at timestamptz,
  users_count bigint, reports_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select s.id, s.title, s.artist, s.created_at,
    (select count(*) from public.user_songs us where us.song_id = s.id),
    (select count(*) from public.song_reports r where r.song_id = s.id)
  from public.songs s
  order by s.created_at desc;
end;
$$;

-- Удаление песни (каскадом чистятся библиотеки/прогресс/замечания)
create or replace function public.admin_delete_song(target uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.songs where id = target;
end;
$$;

-- Замечания списком: с названием песни и почтой автора замечания
create or replace function public.admin_reports()
returns table (
  id uuid, song_id uuid, song_title text, song_artist text,
  email text, comment text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.id, s.id, s.title, s.artist, u.email::text, r.comment, r.created_at
  from public.song_reports r
  left join public.songs s on s.id = r.song_id
  left join auth.users u on u.id = r.user_id
  order by r.created_at desc;
end;
$$;

-- Обновление текста песни: автор или админ, с пересчитанным хэшем
create or replace function public.update_song_lyrics(target uuid, new_lyrics text, new_hash text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or exists (
    select 1 from public.songs where id = target and created_by = auth.uid()
  )) then raise exception 'forbidden'; end if;
  update public.songs set lyrics = new_lyrics, hash = new_hash where id = target;
end;
$$;
