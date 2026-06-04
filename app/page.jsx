"use client";

// Главный экран: библиотека, блок «Пора повторить», серия дней
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  listMySongs,
  getDueSongs,
  getStats,
  getProgress,
  songMastery,
} from "@/lib/storage";
import { getUser } from "@/lib/supabase";
import ProgressRing from "@/components/ProgressRing";

export default function HomePage() {
  const [songs, setSongs] = useState(null);
  const [due, setDue] = useState([]);
  const [stats, setStats] = useState({ streak: 0, totalSongs: 0, mastered: 0 });
  const [mastery, setMastery] = useState({});
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [s, d, st, u] = await Promise.all([
        listMySongs(),
        getDueSongs(),
        getStats(),
        getUser(),
      ]);
      setSongs(s);
      setDue(d);
      setStats(st);
      setUser(u);
      const m = {};
      await Promise.all(
        s.map(async (song) => {
          m[song.id] = songMastery(await getProgress(song.id));
        })
      );
      setMastery(m);
    })();
  }, []);

  const filtered = (songs || []).filter((s) => {
    const q = query.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.artist || "").toLowerCase().includes(q)
    );
  });

  return (
    <main className="pb-safe pt-[max(env(safe-area-inset-top),1.25rem)]">
      {/* Шапка */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient">Запевай</span>
        </h1>
        <div className="flex items-center gap-2">
          {stats.streak > 0 && (
            <span className="glass rounded-full px-3 py-1.5 text-sm font-semibold">
              🔥 {stats.streak}
            </span>
          )}
          <Link
            href="/profile"
            aria-label="Профиль"
            className="flex h-9 w-9 items-center justify-center rounded-full glass text-base"
          >
            {user ? "👤" : "○"}
          </Link>
        </div>
      </div>

      {/* Пора повторить */}
      {due.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
            Пора повторить
          </h2>
          <div className="space-y-2">
            {due.map((s) => (
              <Link
                key={s.id}
                href={`/song/${s.id}`}
                className="glass flex items-center gap-3 rounded-xl2 border-l-4 !border-l-accent p-4 active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">⏰</span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-sub">{s.artist}</span>
                </span>
                <span className="text-sub">›</span>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Поиск */}
      {songs && songs.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по моим песням"
          className="glass mb-4 w-full rounded-xl2 px-4 py-3 text-[16px]"
        />
      )}

      {/* Библиотека */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Мои песни
      </h2>

      {songs === null ? (
        <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
          Загрузка…
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl3 p-8 text-center"
        >
          <p className="mb-1 text-4xl">🎤</p>
          <p className="mb-1 text-lg font-semibold">
            {query ? "Ничего не найдено" : "Здесь появятся твои песни"}
          </p>
          {!query && (
            <p className="text-sm text-sub">
              Добавь текст первой песни — и начнём учить
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <Link
                href={`/song/${s.id}`}
                className="glass flex items-center gap-4 rounded-xl2 p-4 active:scale-[0.98] transition-transform"
              >
                <ProgressRing value={mastery[s.id] || 0} size={48} stroke={4} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.title}</span>
                  <span className="block truncate text-sm text-sub">
                    {s.artist || "Без исполнителя"}
                  </span>
                </span>
                <span className="text-sub">›</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Гостевая подсказка */}
      {!user && songs && songs.length > 0 && (
        <Link
          href="/auth"
          className="mt-4 block rounded-xl2 border border-dashed border-line p-4 text-center text-sm text-sub"
        >
          Войди, чтобы сохранить песни и прогресс навсегда →
        </Link>
      )}

      {/* Кнопка добавления */}
      <Link
        href="/add"
        aria-label="Добавить песню"
        className="fixed bottom-[max(env(safe-area-inset-bottom),1.25rem)] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full btn-gradient text-3xl font-light shadow-xl shadow-accent/30 active:scale-90 transition-transform"
      >
        +
      </Link>
    </main>
  );
}
