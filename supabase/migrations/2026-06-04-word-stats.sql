-- Умные пропуски: статистика по словам (что забывалось, что скрывалось)

create table if not exists public.word_stats (
  user_id uuid references auth.users (id) on delete cascade,
  song_id uuid references public.songs (id) on delete cascade,
  word_index int not null,
  hits int not null default 0,
  misses int not null default 0,
  runs_since_hidden int not null default 0,
  primary key (user_id, song_id, word_index)
);
alter table public.word_stats enable row level security;
drop policy if exists "word_stats_all" on public.word_stats;
create policy "word_stats_all" on public.word_stats
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Запись прогона одним вызовом: всем словам песни +1 к "не скрывалось",
-- скрытым — обнуление счётчика и инкремент hits (вспомнил) / misses (открыл)
create or replace function public.save_word_stats(p_song uuid, p_hidden int[], p_opened int[])
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.word_stats
  set runs_since_hidden = runs_since_hidden + 1
  where user_id = auth.uid() and song_id = p_song;

  insert into public.word_stats (user_id, song_id, word_index, hits, misses, runs_since_hidden)
  select auth.uid(), p_song, idx,
         case when idx = any(p_opened) then 0 else 1 end,
         case when idx = any(p_opened) then 1 else 0 end,
         0
  from unnest(p_hidden) as idx
  on conflict (user_id, song_id, word_index) do update set
    hits = word_stats.hits + excluded.hits,
    misses = word_stats.misses + excluded.misses,
    runs_since_hidden = 0;
end;
$$;
