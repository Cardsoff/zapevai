"use client";

// Режим «Эстафета строк»: видишь строку — вспомни следующую.
// Тренирует связки между строками.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseLyrics, flatLines } from "@/lib/lyrics";
import { tapFeedback } from "@/lib/feedback";
import SelfCheckBar from "./SelfCheckBar";
import TrainProgress from "./TrainProgress";

export default function RelayTrainer({ lyrics, onFinish }) {
  const lines = useMemo(() => flatLines(parseLyrics(lyrics)), [lyrics]);
  const [step, setStep] = useState(0); // индекс строки, которую вспоминаем
  const [pendingOpen, setPendingOpen] = useState(false);
  const [answers, setAnswers] = useState([]);

  // вспоминаем строки с индекса 1 до конца
  const total = Math.max(lines.length - 1, 1);
  const current = step + 1; // строка, которую нужно вспомнить
  const done = answers.length;

  function reveal() {
    if (pendingOpen || current >= lines.length) return;
    tapFeedback();
    setPendingOpen(true);
  }

  function answer(ok) {
    const newAnswers = [...answers, ok];
    setAnswers(newAnswers);
    setPendingOpen(false);
    if (newAnswers.length >= total) {
      const good = newAnswers.filter(Boolean).length;
      setTimeout(() => onFinish(Math.round((good / total) * 100)), 350);
    } else {
      setStep((s) => s + 1);
    }
  }

  const context = lines.slice(Math.max(0, current - 3), current);

  return (
    <div className="pb-safe">
      <TrainProgress done={done} total={total} />

      <div className="glass rounded-xl3 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-sub">
          Строка {current} из {lines.length}
        </p>

        <AnimatePresence mode="popLayout">
          {context.map((line, i) => (
            <motion.p
              key={current - context.length + i}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: i === context.length - 1 ? 1 : 0.45, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className={
                "mb-2 text-[18px] leading-relaxed " +
                (i === context.length - 1 ? "font-semibold" : "")
              }
            >
              {line.text}
            </motion.p>
          ))}
        </AnimatePresence>

        {pendingOpen ? (
          <motion.p
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mt-4 text-[18px] font-semibold leading-relaxed text-accent"
          >
            {lines[current]?.text}
          </motion.p>
        ) : (
          <button
            onClick={reveal}
            className="mt-4 w-full rounded-2xl border-2 border-dashed border-line py-5 text-sub active:scale-[0.98] transition-transform"
          >
            Вспомни следующую строку, затем коснись
          </button>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-sub">
        Произнеси следующую строку вслух или про себя — потом проверь
      </p>

      <SelfCheckBar
        visible={pendingOpen}
        text={lines[current]?.text || ""}
        onAnswer={answer}
      />
    </div>
  );
}
