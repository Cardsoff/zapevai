-- ─── Запевай: схема базы данных Supabase ───
-- Вставь весь файл в SQL Editor в панели Supabase и нажми Run.

-- Песни: общая база для всех пользователей, дубли исключены по hash
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text default '',
  lyrics text not null,
  hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz default now()
);

-- Библиотека пользователя (ссылки на песни, не копии)
create table if not exists public.user_songs (
  user_id uuid references auth.users (id) on delete cascade,
  song_id uuid references public.songs (id) on delete cascade,
  added_at timestamptz default now(),
  learned boolean not null default false,
  primary key (user_id, song_id)
);

-- Прогресс по режимам и уровням
create table if not exists public.progress (
  user_id uuid references auth.users (id) on delete cascade,
  song_id uuid references public.songs (id) on delete cascade,
  mode text not null check (mode in ('cloze', 'letters', 'relay')),
  level int not null default 0,
  best_score int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, song_id, mode, level)
);

-- Интервальные повторения
create table if not exists public.srs (
  user_id uuid references auth.users (id) on delete cascade,
  song_id uuid references public.songs (id) on delete cascade,
  stage int not null default 0,
  next_review date not null,
  primary key (user_id, song_id)
);

-- Дни активности (для серии)
create table if not exists public.activity (
  user_id uuid references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

-- Индексы для поиска
create index if not exists songs_title_idx on public.songs using gin (to_tsvector('simple', title || ' ' || artist));
create index if not exists srs_due_idx on public.srs (user_id, next_review);

-- ─── Row Level Security ───
alter table public.songs enable row level security;
alter table public.user_songs enable row level security;
alter table public.progress enable row level security;
alter table public.srs enable row level security;
alter table public.activity enable row level security;

-- Песни: читать могут все вошедшие, добавлять — любой, менять — только автор
create policy "songs_select" on public.songs
  for select to authenticated using (true);
create policy "songs_insert" on public.songs
  for insert to authenticated with check (created_by = auth.uid());
create policy "songs_update" on public.songs
  for update to authenticated using (created_by = auth.uid());

-- Личные данные: каждый видит и меняет только своё
create policy "user_songs_all" on public.user_songs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_all" on public.progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "srs_all" on public.srs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity_all" on public.activity
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
