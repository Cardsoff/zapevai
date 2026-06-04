"use client";

// Добавление песни: название, исполнитель, текст + проверка на дубль
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { addSong } from "@/lib/storage";
import { parseLyrics } from "@/lib/lyrics";

export default function AddSongPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const words = parseLyrics(lyrics).totalWords;
  const valid = title.trim().length > 0 && words >= 10;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    const res = await addSong({ title, artist, lyrics });
    setBusy(false);
    if (res.error) {
      setNotice({ type: "error", text: "Не получилось сохранить: " + res.error });
      return;
    }
    if (res.duplicate) {
      setNotice({
        type: "dup",
        text: "Такая песня уже есть в базе — добавил её в твою библиотеку, прогресс будет общим.",
        id: res.id,
      });
      setTimeout(() => router.push(`/song/${res.id}`), 1800);
    } else {
      router.push(`/song/${res.id}`);
    }
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
        {notice && (
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
        onClick={submit}
        disabled={!valid || busy}
        className="mt-5 w-full rounded-2xl btn-gradient py-4 text-base font-semibold disabled:opacity-40"
      >
        {busy ? "Сохраняю…" : "Сохранить и учить"}
      </motion.button>
    </main>
  );
}
