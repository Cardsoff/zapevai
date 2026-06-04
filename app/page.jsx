"use client";

// Главный экран — «песенник»: журнальная шапка, серия, повторения, репертуар
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  listMySongs,
  getDueSongs,
  getStats,
  getProgress,
  songMastery,
  migrateGuestData,
  searchSongs,
  addToLibrary,
  applyPendingReferral,
  listBaseSongs,
} from "@/lib/storage";
import { getUser } from "@/lib/supabase";
import WaveLine, { roman } from "@/components/Decor";
import Landing from "@/components/Landing";

export default function HomePage() {
  const [songs, setSongs] = useState(null);
  const [due, setDue] = useState([]);
  const [stats, setStats] = useState({ streak: 0, best: 0, totalSongs: 0, mastered: 0 });
  const [mastery, setMastery] = useState({});
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [landing, setLanding] = useState(false);
  const [theme, setTheme] = useState("light");
  const [baseResults, setBaseResults] = useState(null); // поиск по общей базе
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [suggest, setSuggest] = useState([]);

  async function loadAll() {
    setLoadError(false);
    try {
      // реф-код из ссылки: запоминаем до регистрации
      try {
        const ref = new URLSearchParams(window.location.search).get("ref");
        if (ref) localStorage.setItem("zp_ref", ref);
      } catch {}
      // если гость только что вошёл — перенести его данные в облако
      const u0 = await getUser();
      if (u0) {
        try {
          await migrateGuestData();
        } catch {}
        applyPendingReferral();
      }
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
      try {
        if (!u && s.length === 0 && !localStorage.getItem("zp_skip_landing")) {
          setLanding(true);
        }
      } catch {}
      try {
        setTheme(localStorage.getItem("zp_theme") || "light");
      } catch {}
      const m = {};
      await Promise.all(
        s.map(async (song) => {
          m[song.id] = songMastery(await getProgress(song.id));
        })
      );
      setMastery(m);

      if (s.length < 3) {
        try {
          const base = await listBaseSongs(20);
          const mine = new Set(s.map((x) => x.id));
          setSuggest(base.filter((x) => !mine.has(x.id)).slice(0, 5));
        } catch {}
      } else {
        setSuggest([]);
      }
    } catch (e) {
      setLoadError(true);
      setSongs([]);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (songs || []).filter((s) => {
    const q = query.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.artist || "").toLowerCase().includes(q)
    );
  });

  // поиск по общей базе (только для вошедших), исключая то, что уже в репертуаре
  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setBaseResults(null);
      return;
    }
    const mineIds = new Set((songs || []).map((s) => s.id));
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchSongs(query);
      setBaseResults((res || []).filter((s) => !mineIds.has(s.id)).slice(0, 8));
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, user, songs]);

  async function addFromBase(id) {
    await addToLibrary(id);
    let fresh = [];
    try {
      fresh = await listMySongs();
    } catch {}
    setSongs(fresh);
    setSuggest((list) => list.filter((s) => s.id !== id));
    setQuery("");
    setBaseResults(null);
  }

  const firstDue = due[0];

  function cycleTheme() {
    const order = ["light", "dark", "black"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    try {
      localStorage.setItem("zp_theme", next);
    } catch {}
    if (next === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  if (landing) {
    return (
      <Landing
        onTry={() => {
          try {
            localStorage.setItem("zp_skip_landing", "1");
          } catch {}
          setLanding(false);
        }}
      />
    );
  }

  return (
    <main className="pb-safe pt-[max(env(safe-area-inset-top),1.5rem)]">
      {/* Журнальная шапка */}
      <div className="mb-1 flex items-center justify-end">
        <span className="flex shrink-0 justify-end gap-2">
          <button
            onClick={cycleTheme}
            aria-label="Сменить тему"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-sm"
          >
            {theme === "light" ? "☀" : theme === "dark" ? "☾" : "●"}
          </button>
          <Link
            href="/profile"
            aria-label="Профиль"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-sm"
          >
            {user ? "✓" : "○"}
          </Link>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-center"
      >
        <h1 className="font-serif text-[44px] font-bold leading-tight tracking-tight">
          Запе<span className="italic text-accent">вай</span>
        </h1>
        <p className="font-serif text-[13px] italic text-sub">
          — и пусть слова никогда не забываются
        </p>
      </motion.div>

      <WaveLine className="mb-6 mt-3" />

      {/* Серия дней */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass mb-4 flex items-center gap-4 rounded-xl2 p-4"
      >
        <span className="font-serif text-4xl font-bold italic text-accent tabular-nums">
          {stats.streak}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">
            {stats.streak > 0 ? "дней подряд вы поёте" : "начни серию сегодня"}
          </p>
          {stats.best > 1 && (
            <p className="mt-0.5 text-xs text-sub">
              лучшая серия — {stats.best}{" "}
              {stats.best % 10 === 1 && stats.best % 100 !== 11 ? "день" : stats.best % 10 >= 2 && stats.best % 10 <= 4 && (stats.best % 100 < 12 || stats.best % 100 > 14) ? "дня" : "дней"}
            </p>
          )}
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] " +
                  (i < Math.min(stats.streak, 7)
                    ? "bg-accentDeep text-white"
                    : "border border-dashed border-line text-transparent")
                }
              >
                ✓
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Пора повторить */}
      {firstDue && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6 overflow-hidden rounded-xl2 bg-accentDeep p-5 text-[#fdf6ec]"
        >
          <span className="pointer-events-none absolute -right-2 -top-6 select-none font-serif text-[120px] italic leading-none text-white/10">
            ♪
          </span>
          <p className="kicker mb-2 !text-accent2">Пора повторить</p>
          <p className="font-serif text-xl font-bold leading-snug">
            «{firstDue.title}» <span className="italic font-medium">ждёт вас</span>
          </p>
          <p className="mt-1 text-[13px] opacity-80">
            Память начинает таять — повтори, пока слова тёплые.
            {due.length > 1 ? ` И ещё ${due.length - 1} в очереди.` : ""}
          </p>
          <Link
            href={`/song/${firstDue.id}`}
            className="mt-3 inline-block border-b border-current pb-0.5 text-sm font-semibold"
          >
            Повторить сейчас →
          </Link>
        </motion.section>
      )}

      {/* Ошибка загрузки */}
      {loadError && (
        <div className="glass mb-6 rounded-xl2 p-5 text-center">
          <p className="mb-2 font-serif text-lg font-bold">
            Не удалось загрузить песенник
          </p>
          <p className="mb-3 text-sm text-sub">
            Проверь интернет и попробуй ещё раз
          </p>
          <button
            onClick={loadAll}
            className="btn-gradient rounded-xl2 px-6 py-2.5 text-sm font-semibold active:scale-95 transition-transform"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Репертуар */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl font-bold">Мой репертуар</h2>
        {songs && songs.length > 0 && (
          <span className="font-serif text-sm italic text-sub">
            {songs.length} {plural(songs.length)}
          </span>
        )}
      </div>

      {songs && (songs.length > 3 || user) && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={user ? "Поиск по моим и общей базе" : "Поиск по репертуару"}
          className="glass mb-4 w-full rounded-xl2 px-4 py-3 text-[16px]"
        />
      )}

      {/* Результаты из общей базы */}
      {user && query.trim().length >= 2 && (
        <div className="mb-4">
          <p className="kicker mb-2 !text-[10px]">
            {searching ? "Ищем в общей базе…" : "Из общей базы"}
          </p>
          {baseResults && baseResults.length === 0 && !searching ? (
            <p className="glass rounded-xl2 p-3 text-center font-serif text-sm italic text-sub">
              В общей базе ничего не нашлось
            </p>
          ) : (
            <div className="space-y-2">
              {(baseResults || []).map((s) => (
                <div
                  key={s.id}
                  className="glass flex items-center gap-3 rounded-xl2 p-3 pl-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="kicker block truncate !text-[10px]">
                      {s.artist || "Без исполнителя"}
                    </span>
                    <span className="block truncate font-serif text-[15px] font-bold">
                      {s.title}
                    </span>
                  </span>
                  <button
                    onClick={() => addFromBase(s.id)}
                    className="shrink-0 rounded-xl border border-accent bg-accentDeep px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-transform"
                  >
                    + себе
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          <p className="mb-2 font-serif text-3xl italic text-accent">♪</p>
          <p className="mb-1 font-serif text-xl font-bold">
            {query ? "Ничего не найдено" : "Первая страница пуста"}
          </p>
          {!query && (
            <p className="text-sm text-sub">
              Добавь текст песни — и начнём учить
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <Link
                href={`/song/${s.id}`}
                className="glass spine block rounded-xl2 p-4 pl-5 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 font-serif text-sm italic text-sub">
                    {roman(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="kicker block truncate !text-[10px]">
                      {s.artist || "Без исполнителя"}
                    </span>
                    <span className="block truncate font-serif text-[17px] font-bold leading-snug">
                      {s.title}
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-lg italic text-accent tabular-nums">
                    {mastery[s.id] || 0}
                    <span className="text-xs">%</span>
                  </span>
                </div>
                <div className="bar ml-9 mt-2.5">
                  <i style={{ width: `${mastery[s.id] || 0}%` }} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Случайные песни из общей базы для новичков */}
      {suggest.length > 0 && !query && !loadError && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-serif text-xl font-bold">Попробуй из общей базы</h2>
            <span className="rule flex-1" />
          </div>
          <div className="space-y-2">
            {suggest.map((s) => (
              <div
                key={s.id}
                className="glass flex items-center gap-3 rounded-xl2 p-3 pl-4"
              >
                <Link href={`/song/${s.id}`} className="min-w-0 flex-1">
                  <span className="kicker block truncate !text-[10px]">
                    {s.artist || "Без исполнителя"}
                  </span>
                  <span className="block truncate font-serif text-[15px] font-bold">
                    {s.title}
                  </span>
                </Link>
                {user ? (
                  <button
                    onClick={() => addFromBase(s.id)}
                    className="shrink-0 rounded-xl border border-accent bg-accentDeep px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-transform"
                  >
                    + себе
                  </button>
                ) : (
                  <Link
                    href={`/song/${s.id}`}
                    className="shrink-0 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold"
                  >
                    Учить
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!user && songs && songs.length > 0 && (
        <Link
          href="/auth"
          className="mt-4 block rounded-xl2 border border-dashed border-line p-4 text-center font-serif text-sm italic text-sub"
        >
          Войди, чтобы песенник сохранился навсегда →
        </Link>
      )}

      {/* Кнопка добавления */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-20 mx-auto flex w-full max-w-lg justify-end px-4">
        <Link
          href="/add"
          aria-label="Добавить песню"
          className="btn-ink pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-xl shadow-black/25 active:scale-90 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    </main>
  );
}

function plural(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "песня";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "песни";
  return "песен";
}
