"use client";

// Добавление песни: название, исполнитель, текст.
// Дубли: по хэшу текста и по названию. Живой поиск по общей базе.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { addSong, addToLibrary, searchSongs } from "@/lib/storage";
import { getUser } from "@/lib/supabase";
import { parseLyrics } from "@/lib/lyrics";

export default function AddSongPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [user, setUser] = useState(null);
  const [found, setFound] = useState([]); // подсказки из общей базы
  const timer = useRef(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  // живой поиск по общей базе при вводе названия (для вошедших)
  useEffect(() => {
    if (!user || title.trim().length < 3) {
      setFound([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await searchSongs(title);
      setFound((res || []).slice(0, 4));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [title, user]);

  const words = parseLyrics(lyrics).totalWords;
  const valid = title.trim().length > 0 && words >= 10;

  async function submit(force = false) {
    if (!valid || busy) return;
    setBusy(true);
    const res = await addSong({ title, artist, lyrics, force });
    setBusy(false);
    if (res.error) {
      setNotice({ type: "error", text: "Не получилось сохранить: " + res.error });
      return;
    }
    if (res.nameMatch) {
      setNotice({ type: "name", match: res.nameMatch });
      return;
    }
    if (res.duplicate) {
      setNotice({
        type: "dup",
        text: "Такая песня уже есть в базе — добавил её в твою библиотеку, прогресс будет общим.",
      });
      setTimeout(() => router.push(`/song/${res.id}`), 1800);
    } else {
      router.push(`/song/${res.id}`);
    }
  }

  async function useExisting(id) {
    setBusy(true);
    await addToLibrary(id);
    router.push(`/song/${id}`);
  }

  return (
    <main className="pb-safe">
      <Header title="Новая песня" />

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название песни"
          className="glass w-full rounded-xl2 px-4 py-3.5 text-[16px] font-medium"
        />

        {/* Подсказки из общей базы */}
        <AnimatePresence>
          {found.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-xl2 p-2"
            >
              <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-sub">
                Уже есть в базе — добавить себе?
              </p>
              {found.map((s) => (
                <button
                  key={s.id}
                  onClick={() => useExisting(s.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left active:bg-line/50"
                >
                  <span className="text-base">🎵</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-sub">
                      {s.artist || "Без исполнителя"}
                    </span>
                  </span>
                  <span className="text-sub">+</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Исполнитель"
          className="glass w-full rounded-xl2 px-4 py-3.5 text-[16px]"
        />
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={
            "Вставь текст песни…\n\nКуплеты разделяй пустой строкой — так тренировки будут удобнее."
          }
          rows={12}
          className="glass w-full resize-none rounded-xl2 px-4 py-3.5 text-[16px] leading-relaxed"
        />
        <p className="px-1 text-right text-xs text-sub">
          {words > 0 ? `${words} слов` : "минимум 10 слов"}
        </p>
      </div>

      <AnimatePresence>
        {notice && notice.type === "name" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-xl2 bg-accent/10 p-4 text-sm"
          >
            <p className="mb-3">
              Похоже, эта песня уже есть в базе:{" "}
              <b>
                {notice.match.title}
                {notice.match.artist ? ` — ${notice.match.artist}` : ""}
              </b>
              . Использовать её?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => useExisting(notice.match.id)}
                className="flex-1 rounded-xl2 btn-gradient py-2.5 text-sm font-semibold"
              >
                Да, открыть её
              </button>
              <button
                onClick={() => {
                  setNotice(null);
                  submit(true);
                }}
                className="flex-1 rounded-xl2 glass py-2.5 text-sm font-semibold"
              >
                Сохранить мою
              </button>
            </div>
          </motion.div>
        )}
        {notice && notice.type !== "name" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={
              "mt-3 rounded-xl2 p-4 text-sm " +
              (notice.type === "error"
                ? "bg-bad/10 text-bad"
                : "bg-accent/10 text-accent")
            }
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => submit(false)}
        disabled={!valid || busy}
        className="mt-5 w-full rounded-2xl btn-gradient py-4 text-base font-semibold disabled:opacity-40"
      >
        {busy ? "Сохраняю…" : "Сохранить и учить"}
      </motion.button>
    </main>
  );
}
