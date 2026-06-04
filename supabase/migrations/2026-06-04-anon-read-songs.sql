-- Гости могут читать общую базу песен (только оригиналы, не личные копии)
drop policy if exists "songs_select_anon" on public.songs;
create policy "songs_select_anon" on public.songs
  for select to anon using (parent_id is null);
