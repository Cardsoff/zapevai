"use client";

// Режим «Первые буквы»: от каждого слова видна только первая буква.
// Тап по строке открывает её целиком, затем самопроверка.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseLyrics, flatLines } from "@/lib/lyrics";
import { tapFeedback } from "@/lib/feedback";
import SelfCheckBar from "./SelfCheckBar";
import TrainProgress from "./TrainProgress";

export default function LettersTrainer({ lyrics, onFinish }) {
  const lines = useMemo(() => flatLines(parseLyrics(lyrics)), [lyrics]);
  const [revealed, setRevealed] = useState({});
  const [answers, setAnswers] = useState({});
  const [pending, setPending] = useState(null); // index строки

  const total = lines.length;
  const done = Object.keys(answers).length;

  function tapLine(idx) {
    if (pending !== null || revealed[idx]) return;
    tapFeedback();
    setRevealed((r) => ({ ...r, [idx]: true }));
    setPending(idx);
  }

  function answer(ok) {
    const newAnswers = { ...answers, [pending]: ok };
    setAnswers(newAnswers);
    setPending(null);
    if (Object.keys(newAnswers).length === total) {
      const good = Object.values(newAnswers).filter(Boolean).length;
      setTimeout(() => onFinish(Math.round((good / total) * 100)), 350);
    }
  }

  let prevSection = -1;

  return (
    <div className="pb-safe">
      <TrainProgress done={done} total={total} />
      <div className="glass rounded-xl3 p-5">
        {lines.map((line, idx) => {
          const newSection = line.section !== prevSection;
          prevSection = line.section;
          const isOpen = revealed[idx];
          const ok = answers[idx];
          return (
            <div key={idx} className={newSection && idx > 0 ? "mt-6" : ""}>
              {isOpen ? (
                <motion.p
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className={
                    "mb-2 font-serif text-[17px] leading-relaxed font-semibold " +
                    (ok === undefined
                      ? "text-accent"
                      : ok
                      ? "text-good"
                      : "text-bad")
                  }
                >
                  {line.text}
                </motion.p>
              ) : (
                <p
                  onClick={() => tapLine(idx)}
                  className="mb-2 cursor-pointer font-serif text-[17px] leading-relaxed tracking-wide active:opacity-60 transition-opacity"
                >
                  {line.tokens.map((t, ti) =>
                    t.type === "word" ? (
                      <span key={ti}>
                        <span className="font-semibold">{t.text.charAt(0)}</span>
                        <span className="select-none text-sub opacity-50">
                          {"·".repeat(Math.min(Math.max(t.text.length - 1, 1), 6))}
                        </span>
                      </span>
                    ) : (
                      <span key={ti}>{t.text}</span>
                    )
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-sm text-sub">
        Произнеси строку по первым буквам, затем коснись её для проверки
      </p>
      <SelfCheckBar
        visible={pending !== null}
        text={pending !== null ? lines[pending].text : ""}
        onAnswer={answer}
      />
    </div>
  );
}
