"use client";

// Карточка песни: прогресс, уровни «Пропусков», режимы, текст
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ProgressRing from "@/components/ProgressRing";
import { getSong, getProgress, removeSong, songMastery } from "@/lib/storage";
import { CLOZE_LEVELS } from "@/lib/lyrics";
import { isDue } from "@/lib/srs";

export default function SongScreen({ id }) {
  const router = useRouter();
  const [song, setSong] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([getSong(id), getProgress(id)]);
      setSong(s);
      setProgress(p);
    })();
  }, [id]);

  if (song === null) {
    return (
      <main>
        <Header title="Песня" />
        <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
          Загрузка…
        </div>
      </main>
    );
  }

  const mastery = songMastery(progress);
  const due = isDue(progress?.srs);
  // следующий рекомендуемый уровень пропусков
  let nextLevel = 1;
  for (let l = 1; l <= 5; l++) {
    if ((progress?.cloze?.[l] || 0) >= 90) nextLevel = Math.min(l + 1, 5);
  }

  async function doDelete() {
    await removeSong(id);
    router.push("/");
  }

  return (
    <main className="pb-safe">
      <Header title={song.title} />

      {/* Сводка */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mb-5 flex items-center gap-4 rounded-xl3 p-5"
      >
        <ProgressRing value={mastery} size={72} stroke={6} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{song.title}</p>
          <p className="truncate text-sm text-sub">
            {song.artist || "Без исполнителя"}
          </p>
          {due && (
            <p className="mt-1 text-xs font-semibold text-accent">
              ⏰ Пора повторить
            </p>
          )}
        </div>
      </motion.div>

      {/* Пропуски слов — 5 уровней */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Пропуски слов
      </h2>
      <div className="mb-6 space-y-2">
        {CLOZE_LEVELS.map((lvl, i) => {
          const score = progress?.cloze?.[lvl.level] || 0;
          const passed = score >= 90;
          const recommended = lvl.level === nextLevel;
          return (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/train/${id}?mode=cloze&level=${lvl.level}`}
                className={
                  "glass flex items-center gap-3 rounded-xl2 p-4 active:scale-[0.98] transition-transform " +
                  (recommended ? "ring-2 ring-accent/60" : "")
                }
              >
                <span
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold " +
                    (passed ? "bg-good/15 text-good" : "glass")
                  }
                >
                  {passed ? "✓" : lvl.level}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">
                    {lvl.name}
                    {recommended && (
                      <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        дальше
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-sub">{lvl.desc}</span>
                </span>
                {score > 0 && (
                  <span className="text-sm font-semibold tabular-nums text-sub">
                    {score}%
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Другие режимы */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Другие режимы
      </h2>
      <div className="mb-6 space-y-2">
        <Link
          href={`/train/${id}?mode=letters`}
          className="glass flex items-center gap-3 rounded-xl2 p-4 active:scale-[0.98] transition-transform"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full glass text-base">
            А·
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Первые буквы</span>
            <span className="block text-xs text-sub">
              Вспомни строки по первым буквам слов
            </span>
          </span>
          {(progress?.letters || 0) > 0 && (
            <span className="text-sm font-semibold text-sub">
              {progress.letters}%
            </span>
          )}
        </Link>
        <Link
          href={`/train/${id}?mode=relay`}
          className="glass flex items-center gap-3 rounded-xl2 p-4 active:scale-[0.98] transition-transform"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full glass text-base">
            ⇄
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Эстафета строк</span>
            <span className="block text-xs text-sub">
              Видишь строку — вспомни следующую
            </span>
          </span>
          {(progress?.relay || 0) > 0 && (
            <span className="text-sm font-semibold text-sub">
              {progress.relay}%
            </span>
          )}
        </Link>
      </div>

      {/* Текст песни */}
      <button
        onClick={() => setShowLyrics(!showLyrics)}
        className="glass mb-2 w-full rounded-xl2 p-4 text-left font-semibold active:scale-[0.99] transition-transform"
      >
        {showLyrics ? "Скрыть текст ▲" : "Показать текст ▼"}
      </button>
      {showLyrics && (
        <motion.pre
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass mb-4 whitespace-pre-wrap rounded-xl2 p-5 font-sans text-[15px] leading-relaxed"
        >
          {song.lyrics}
        </motion.pre>
      )}

      {/* Удаление */}
      {confirmDelete ? (
        <div className="mt-6 flex gap-2">
          <button
            onClick={doDelete}
            className="flex-1 rounded-xl2 bg-bad/10 py-3 font-semibold text-bad"
          >
            Точно убрать
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-xl2 glass py-3 font-semibold"
          >
            Отмена
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="mt-6 w-full py-2 text-sm text-sub"
        >
          Убрать из библиотеки
        </button>
      )}
    </main>
  );
}
