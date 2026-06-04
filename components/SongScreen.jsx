"use client";

// Карточка песни: прогресс, уровни «Пропусков», режимы, текст
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import ProgressRing from "@/components/ProgressRing";
import {
  getSong,
  getProgress,
  removeSong,
  setLearned,
  songMastery,
  getPlan,
} from "@/lib/storage";
import { CLOZE_LEVELS } from "@/lib/lyrics";
import { isDue } from "@/lib/srs";
import { roman } from "@/components/Decor";
import { goodFeedback, tapFeedback } from "@/lib/feedback";

export default function SongScreen({ id }) {
  const router = useRouter();
  const [song, setSong] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selected, setSelected] = useState(null); // выбранный уровень
  const [learned, setLearnedState] = useState(false);
  const [plan, setPlan] = useState("pro"); // чтобы замки не мигали у Pro
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, p, pl] = await Promise.all([
        getSong(id),
        getProgress(id),
        getPlan(),
      ]);
      setSong(s);
      setProgress(p);
      setPlan(pl);
      setLearnedState(Boolean(p?.learned));
      if (!s) setFailed(true);
    })();
  }, [id]);

  if (song === null) {
    return (
      <main>
        <Header title="Песня" />
        {failed ? (
          <div className="glass rounded-xl3 p-8 text-center">
            <p className="mb-2 font-serif text-lg font-bold">
              Песня не загрузилась
            </p>
            <p className="mb-4 text-sm text-sub">
              Нет связи или песня была убрана
            </p>
            <button
              onClick={() => location.reload()}
              className="btn-gradient rounded-xl2 px-6 py-2.5 text-sm font-semibold"
            >
              Повторить
            </button>
          </div>
        ) : (
          <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
            Загрузка…
          </div>
        )}
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

  function pickLevel(level) {
    tapFeedback();
    setSelected(selected === level ? null : level);
  }

  async function toggleLearned() {
    const next = !learned;
    setLearnedState(next);
    if (next) goodFeedback();
    await setLearned(id, next);
  }

  async function doDelete() {
    await removeSong(id);
    router.push("/");
  }

  return (
    <main className="pb-32">
      <Header title={song.title} />

      {/* Сводка */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mb-5 flex items-center gap-4 rounded-xl3 p-5"
      >
        <ProgressRing value={mastery} size={72} stroke={6} />
        <div className="min-w-0 flex-1">
          <p className="kicker truncate !text-[10px]">
            {song.artist || "Без исполнителя"}
          </p>
          <p className="truncate font-serif text-xl font-bold">{song.title}</p>
          {learned && (
            <p className="mt-1 text-xs font-semibold text-good">🏆 Выучено</p>
          )}
          {due && !learned && (
            <p className="mt-1 text-xs font-semibold text-accent">
              ⏰ Пора повторить
            </p>
          )}
        </div>
      </motion.div>

      {/* Пропуски слов — 5 уровней */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Пропуски слов</h2>
        <span className="rule flex-1" />
      </div>
      <div className="mb-6 space-y-2">
        {CLOZE_LEVELS.map((lvl, i) => {
          const score = progress?.cloze?.[lvl.level] || 0;
          const passed = score >= 90;
          const recommended = lvl.level === nextLevel;
          const isSelected = selected === lvl.level;
          return (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <motion.button
                onClick={() => pickLevel(lvl.level)}
                animate={
                  isSelected
                    ? { scale: 1.02, backgroundColor: "var(--wine)" }
                    : { scale: 1 }
                }
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={
                  "glass flex w-full items-center gap-3 rounded-xl2 p-4 text-left transition-shadow " +
                  (isSelected
                    ? "text-[#fdf6ec] shadow-xl shadow-accent/30"
                    : recommended
                    ? "ring-1 ring-accent/40"
                    : "")
                }
              >
                <span
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors " +
                    (isSelected
                      ? "bg-white/20 text-white"
                      : passed
                      ? "bg-good/15 text-good"
                      : "glass")
                  }
                >
                  {passed ? (
                    "✓"
                  ) : (
                    <span className="font-serif italic">
                      {roman(lvl.level).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{lvl.name}</span>
                  <span
                    className={
                      "block text-xs " + (isSelected ? "text-white/70" : "text-sub")
                    }
                  >
                    {lvl.desc}
                  </span>
                </span>
                {score > 0 && (
                  <span
                    className={
                      "font-serif text-base italic tabular-nums " +
                      (isSelected ? "text-white" : "text-accent")
                    }
                  >
                    {score}<span className="text-xs">%</span>
                  </span>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Другие режимы */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Другие режимы</h2>
        <span className="rule flex-1" />
      </div>
      <div className="mb-6 space-y-2">
        {plan === "free" && (
          <p className="mb-1 font-serif text-xs italic text-sub">
            Эти режимы открываются в «Запевай Про»
          </p>
        )}
        <Link
          href={plan === "free" ? "/profile" : `/train/${id}?mode=letters`}
          className="glass flex items-center gap-3 rounded-xl2 p-4 active:scale-[0.98] transition-transform"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full glass text-base">
            {plan === "free" ? "🔒" : "А·"}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Первые буквы</span>
            <span className="block text-xs text-sub">
              Вспомни строки по первым буквам слов
            </span>
          </span>
          {(progress?.letters || 0) > 0 && (
            <span className="font-serif text-base italic text-accent">
              {progress.letters}<span className="text-xs">%</span>
            </span>
          )}
        </Link>
        <Link
          href={plan === "free" ? "/profile" : `/train/${id}?mode=relay`}
          className="glass flex items-center gap-3 rounded-xl2 p-4 active:scale-[0.98] transition-transform"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full glass text-base">
            {plan === "free" ? "🔒" : "⇄"}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Эстафета строк</span>
            <span className="block text-xs text-sub">
              Видишь строку — вспомни следующую
            </span>
          </span>
          {(progress?.relay || 0) > 0 && (
            <span className="font-serif text-base italic text-accent">
              {progress.relay}<span className="text-xs">%</span>
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
          className="glass mb-4 whitespace-pre-wrap rounded-xl2 p-5 font-serif text-[16px] leading-relaxed"
        >
          {song.lyrics}
        </motion.pre>
      )}

      {/* В выучено */}
      <button
        onClick={toggleLearned}
        className={
          "mt-4 w-full rounded-xl2 py-3.5 font-semibold active:scale-[0.98] transition-all " +
          (learned ? "bg-good/15 text-good" : "glass")
        }
      >
        {learned ? "🏆 В выучено ✓" : "Добавить в выучено"}
      </button>

      {/* Удаление */}
      {plan === "free" ? (
        <p className="mt-3 w-full py-2 text-center font-serif text-xs italic text-sub">
          Удаление песен и безлимит — в «Запевай Про»
        </p>
      ) : confirmDelete ? (
        <div className="mt-3 flex gap-2">
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
          className="mt-3 w-full py-2 text-sm text-sub"
        >
          Убрать из библиотеки
        </button>
      )}

      {/* Кнопка «Начать» при выбранном уровне */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <div className="glass rounded-xl3 p-4 shadow-2xl shadow-black/10">
              <button
                onClick={() =>
                  router.push(`/train/${id}?mode=cloze&level=${selected}`)
                }
                className="w-full rounded-2xl btn-gradient py-3.5 text-base font-semibold active:scale-95 transition-transform"
              >
                Начать ·{" "}
                {CLOZE_LEVELS.find((l) => l.level === selected)?.name}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
