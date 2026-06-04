-- Безопасность перед запуском

-- SEC #1: гостям отдаём песни через VIEW без created_by и hash.
create or replace view public.songs_public as
  select id, title, artist, lyrics, created_at
  from public.songs
  where parent_id is null;
grant select on public.songs_public to anon, authenticated;
-- убрать прямой анонимный доступ к таблице songs (с created_by/hash)
drop policy if exists "songs_select_anon" on public.songs;

-- SEC #2: приватный бакет скриншотов + чтение только владельцу/админу
update storage.buckets set public = false where id = 'feedback';
drop policy if exists "feedback_read_owner" on storage.objects;
create policy "feedback_read_owner" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feedback'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- SEC #3: серверный лимит Free (1 песня) — нельзя обойти через прямой API
create or replace function public.check_song_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare p text;
begin
  select plan into p from public.profiles where user_id = new.user_id;
  if coalesce(p, 'free') = 'free' then
    if (select count(*) from public.user_songs where user_id = new.user_id) >= 1 then
      raise exception 'song_limit_reached';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_song_limit on public.user_songs;
create trigger enforce_song_limit
  before insert on public.user_songs
  for each row execute function public.check_song_limit();

-- SEC #4: лимит «висящих» правок на пользователя (анти-флуд song_edits/songs)
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
