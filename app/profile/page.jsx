"use client";

// Профиль: статистика, звук, аккаунт
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getStats } from "@/lib/storage";
import { getUser, signOut, supabaseEnabled } from "@/lib/supabase";
import { toggleSound, soundEnabled } from "@/lib/feedback";

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ streak: 0, totalSongs: 0, mastered: 0 });
  const [user, setUser] = useState(null);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    getStats().then(setStats);
    getUser().then(setUser);
    setSound(soundEnabled());
  }, []);

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

      {/* Настройки */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Настройки
      </h2>
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Аккаунт
      </h2>
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

      <p className="mt-8 text-center text-xs text-sub">
        Запевай · учи песни с удовольствием
      </p>
    </main>
  );
}
