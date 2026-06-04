-- Гибридные правки: личная копия при редактировании + предложение в общую базу

alter table public.songs add column if not exists parent_id uuid references public.songs (id) on delete set null;

-- Предложенные правки (копия ждёт решения админа)
create table if not exists public.song_edits (
  id uuid primary key default gen_random_uuid(),
  original_id uuid references public.songs (id) on delete cascade,
  copy_id uuid references public.songs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz default now()
);
alter table public.song_edits enable row level security;
drop policy if exists "edits_insert" on public.song_edits;
create policy "edits_insert" on public.song_edits
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "edits_admin_read" on public.song_edits;
create policy "edits_admin_read" on public.song_edits
  for select to authenticated using (public.is_admin());
drop policy if exists "edits_admin_delete" on public.song_edits;
create policy "edits_admin_delete" on public.song_edits
  for delete to authenticated using (public.is_admin());

-- Список предложенных правок с текстами для диффа
create or replace function public.admin_edits()
returns table (
  id uuid, original_id uuid, copy_id uuid,
  title text, artist text, email text,
  old_lyrics text, new_lyrics text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select e.id, o.id, c.id, o.title, o.artist, u.email::text,
         o.lyrics, c.lyrics, e.created_at
  from public.song_edits e
  join public.songs o on o.id = e.original_id
  join public.songs c on c.id = e.copy_id
  left join auth.users u on u.id = e.user_id
  order by e.created_at desc;
end;
$$;

-- Принять правку в общую базу (текст копии заменяет оригинал)
create or replace function public.admin_apply_edit(edit_id uuid, new_hash text)
returns text
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into e from public.song_edits where id = edit_id;
  if e is null then return 'не найдено'; end if;
  if exists (select 1 from public.songs where hash = new_hash and id <> e.original_id and parent_id is null) then
    delete from public.song_edits where id = edit_id;
    return 'конфликт: такой текст уже есть в базе';
  end if;
  update public.songs
  set lyrics = (select lyrics from public.songs where id = e.copy_id),
      hash = new_hash
  where id = e.original_id;
  delete from public.song_edits where id = edit_id;
  return 'ok';
end;
$$;

-- Личные копии не светятся в общих выборках (поиск/подсказки шерстят parent_id is null)
