"use client";

// Профиль: статистика, звук, аккаунт
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getStats, listLearnedSongs, ADMIN_EMAILS } from "@/lib/storage";
import { getUser, signOut, supabaseEnabled } from "@/lib/supabase";
import { toggleSound, soundEnabled } from "@/lib/feedback";

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ streak: 0, best: 0, totalSongs: 0, mastered: 0 });
  const [learned, setLearned] = useState(null);
  const [user, setUser] = useState(null);
  const [sound, setSound] = useState(true);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    getStats().then(setStats);
    listLearnedSongs().then(setLearned);
    getUser().then(setUser);
    setSound(soundEnabled());
    try {
      setTheme(localStorage.getItem("zp_theme") || "light");
    } catch {}
  }, []);

  function applyTheme(t) {
    setTheme(t);
    try {
      localStorage.setItem("zp_theme", t);
    } catch {}
    if (t === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", t);
    }
  }

  return (
    <main className="pb-safe">
      <Header title="Профиль" />

      {/* Статистика */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { v: stats.streak, l: "дней подряд", e: "🔥" },
          { v: stats.totalSongs, l: "песен", e: "🎵" },
          { v: stats.mastered, l: "наизусть", e: "🏆" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-xl2 p-4 text-center">
            <p className="text-lg">{s.e}</p>
            <p className="font-serif text-3xl font-bold italic text-accent tabular-nums">{s.v}</p>
            <p className="text-xs text-sub">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Выучено наизусть */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Выучено наизусть</h2>
        <span className="rule flex-1" />
      </div>
      {learned === null ? (
        <div className="glass mb-6 animate-pulse rounded-xl2 p-6 text-center text-sub">
          Загрузка…
        </div>
      ) : learned.length === 0 ? (
        <div className="glass mb-6 rounded-xl2 p-5 text-center">
          <p className="font-serif text-sm italic text-sub">
            Здесь появятся песни, которые ты отметишь как выученные
          </p>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          {learned.map((s) => (
            <Link
              key={s.id}
              href={`/song/${s.id}`}
              className="glass spine flex items-center gap-3 rounded-xl2 p-4 pl-5 active:scale-[0.98] transition-transform"
            >
              <span className="font-serif text-lg italic text-accent">🏆</span>
              <span className="min-w-0 flex-1">
                <span className="kicker block truncate !text-[10px]">
                  {s.artist || "Без исполнителя"}
                </span>
                <span className="block truncate font-serif text-[16px] font-bold">
                  {s.title}
                </span>
              </span>
              <span className="text-sub">›</span>
            </Link>
          ))}
        </div>
      )}

      {/* Настройки */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Настройки</h2>
        <span className="rule flex-1" />
      </div>
      <div className="glass mb-3 rounded-xl2 p-4">
        <p className="mb-3 font-semibold">Тема</p>
        <div className="flex gap-2">
          {[
            { id: "light", name: "Бумага" },
            { id: "dark", name: "Тёмная" },
            { id: "black", name: "Чёрная" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={
                "flex-1 rounded-xl2 border py-2.5 text-sm font-semibold transition-all " +
                (theme === t.id
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-card")
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setSound(toggleSound())}
        className="glass mb-6 flex w-full items-center justify-between rounded-xl2 p-4 active:scale-[0.99] transition-transform"
      >
        <span className="font-semibold">Звуки успеха</span>
        <span
          className={
            "flex h-7 w-12 items-center rounded-full px-1 transition-colors " +
            (sound ? "bg-good" : "bg-line")
          }
        >
          <span
            className={
              "h-5 w-5 rounded-full bg-white shadow transition-transform " +
              (sound ? "translate-x-5" : "")
            }
          />
        </span>
      </button>

      {/* Аккаунт */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Аккаунт</h2>
        <span className="rule flex-1" />
      </div>
      {user ? (
        <div className="glass rounded-xl2 p-4">
          <p className="mb-1 font-semibold">{user.email}</p>
          <p className="mb-4 text-sm text-sub">
            Песни и прогресс сохраняются в облаке
          </p>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="w-full rounded-xl2 bg-bad/10 py-3 font-semibold text-bad"
          >
            Выйти
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl2 p-4">
          <p className="mb-1 font-semibold">Гостевой режим</p>
          <p className="mb-4 text-sm text-sub">
            Всё хранится в этом браузере.{" "}
            {supabaseEnabled()
              ? "Войди, чтобы не потерять прогресс."
              : "Облако появится после подключения Supabase."}
          </p>
          {supabaseEnabled() && (
            <Link
              href="/auth"
              className="block w-full rounded-xl2 btn-gradient py-3 text-center font-semibold"
            >
              Войти
            </Link>
          )}
        </div>
      )}

      {user && ADMIN_EMAILS.includes(user.email) && (
        <Link
          href="/admin"
          className="glass mt-4 block rounded-xl2 p-4 text-center font-semibold active:scale-[0.99] transition-transform"
        >
          🛠 Массовая загрузка песен
        </Link>
      )}

      <p className="mt-8 text-center text-xs text-sub">
        Запевай · учи песни с удовольствием
      </p>
    </main>
  );
}
