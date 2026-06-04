-- Миграция: флаг «выучено» в библиотеке пользователя.
-- Безопасна для данных: только добавляет колонку, ничего не удаляет.
-- Вставь в Supabase → SQL Editor → Run.

alter table public.user_songs
  add column if not exists learned boolean not null default false;
