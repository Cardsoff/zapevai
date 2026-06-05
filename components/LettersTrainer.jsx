"use client";

// Режим «Первые буквы»: от каждого слова видна первая буква, остальное — туман.
// Вспомнил слово — не трогай. Забыл — коснись, оно откроется (= «забыл»).
// В конце «Готово» — счёт считается автоматически, как в «Пропусках».

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseLyrics, flatLines } from "@/lib/lyrics";
import { tapFeedback } from "@/lib/feedback";

export default function LettersTrainer({ lyrics, onFinish }) {
  const lines = useMemo(() => flatLines(parseLyrics(lyrics)), [lyrics]);
  const [revealed, setRevealed] = useState({});

  const total = useMemo(() => {
    let n = 0;
    lines.forEach((line) =>
      line.tokens.forEach((t) => {
        if (t.type === "word" && t.text.length > 1) n += 1;
      })
    );
    return n;
  }, [lines]);

  const opened = Object.keys(revealed).length;

  function tapWord(key) {
    if (revealed[key]) return;
    tapFeedback();
    setRevealed((r) => ({ ...r, [key]: true }));
  }

  function finish() {
    onFinish(Math.round(((total - opened) / Math.max(total, 1)) * 100));
  }

  let prevSection = -1;

  return (
    <div className="pb-32">
      <div className="glass rounded-xl3 p-5">
        {lines.map((line, idx) => {
          const newSection = line.section !== prevSection;
          prevSection = line.section;
          return (
            <p
              key={idx}
              className={
                "mb-2 font-serif text-[17px] leading-relaxed" +
                (newSection && idx > 0 ? " mt-6" : "")
              }
            >
              {line.tokens.map((t, ti) => {
                if (t.type !== "word" || t.text.length <= 1)
                  return <span key={ti}>{t.text}</span>;
                const k = idx + ":" + ti;
                if (revealed[k]) {
                  return (
                    <motion.span
                      key={ti}
                      initial={{ opacity: 0, filter: "blur(6px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block rounded-md px-0.5 font-semibold italic text-accent"
                    >
                      {t.text}
                    </motion.span>
                  );
                }
                return (
                  <span
                    key={ti}
                    role="button"
                    tabIndex={0}
                    aria-label="Скрытое слово — коснись, чтобы открыть"
                    className="inline-block cursor-pointer whitespace-nowrap"
                    onClick={() => tapWord(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        tapWord(k);
                      }
                    }}
                  >
                    <span className="font-semibold text-accent">
                      {t.text.charAt(0)}
                    </span>
                    <span className="fog-tail" aria-hidden="true">
                      {t.text.slice(1)}
                    </span>
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm text-sub">
        Вспомни слово по первой букве. Забыл — коснись, и оно откроется.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="glass rounded-xl3 p-4 shadow-2xl shadow-black/10">
          <p className="mb-3 text-center font-serif text-sm italic text-sub">
            Забыл:{" "}
            <span className="font-bold not-italic text-accent">
              {opened} из {total}
            </span>{" "}
            слов
          </p>
          <button
            onClick={finish}
            className="w-full rounded-2xl btn-gradient py-3.5 text-base font-semibold active:scale-95 transition-transform"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
