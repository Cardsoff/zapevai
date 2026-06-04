-- Скриншоты к замечаниям/предложениям: бакет + колонка + политика загрузки

insert into storage.buckets (id, name, public)
values ('feedback', 'feedback', true)
on conflict (id) do nothing;

drop policy if exists "feedback_upload" on storage.objects;
create policy "feedback_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.song_reports add column if not exists screenshot_url text;

-- admin_reports теперь со скриншотом (смена типа возврата — пересоздаём)
drop function if exists public.admin_reports();
create or replace function public.admin_reports()
returns table (
  id uuid, song_id uuid, song_title text, song_artist text,
  email text, comment text, screenshot_url text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.id, s.id, s.title, s.artist, u.email::text, r.comment, r.screenshot_url, r.created_at
  from public.song_reports r
  left join public.songs s on s.id = r.song_id
  left join auth.users u on u.id = r.user_id
  order by r.created_at desc;
end;
$$;
