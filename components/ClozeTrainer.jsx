"use client";

// Режим «Пропуски слов»: часть слов скрыта, тап открывает слово,
// затем самопроверка «Помнил / Забыл».

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseLyrics, pickHiddenWords } from "@/lib/lyrics";
import { tapFeedback } from "@/lib/feedback";
import SelfCheckBar from "./SelfCheckBar";
import TrainProgress from "./TrainProgress";

export default function ClozeTrainer({ lyrics, level, onFinish }) {
  const parsed = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const hidden = useMemo(() => pickHiddenWords(parsed, level), [parsed, level]);

  const [revealed, setRevealed] = useState({}); // i -> true
  const [answers, setAnswers] = useState({}); // i -> bool (помнил?)
  const [pending, setPending] = useState(null); // {i, text}

  const total = hidden.size;
  const done = Object.keys(answers).length;

  function tapWord(token) {
    if (pending || revealed[token.i]) return;
    tapFeedback();
    setRevealed((r) => ({ ...r, [token.i]: true }));
    setPending({ i: token.i, text: token.text });
  }

  function answer(ok) {
    const newAnswers = { ...answers, [pending.i]: ok };
    setAnswers(newAnswers);
    setPending(null);
    if (Object.keys(newAnswers).length === total) {
      const good = Object.values(newAnswers).filter(Boolean).length;
      setTimeout(() => onFinish(Math.round((good / total) * 100)), 350);
    }
  }

  return (
    <div className="pb-safe">
      <TrainProgress done={done} total={total} />
      <div className="space-y-6">
        {parsed.sections.map((sec, si) => (
          <div key={si} className="glass rounded-xl3 p-5">
            {sec.lines.map((line, li) => (
              <p key={li} className="mb-1.5 text-[17px] leading-relaxed">
                {line.tokens.map((t, ti) => {
                  if (t.type === "sep") return <span key={ti}>{t.text}</span>;
                  if (!hidden.has(t.i)) return <span key={ti}>{t.text}</span>;
                  const isOpen = revealed[t.i];
                  if (!isOpen) {
                    return (
                      <span
                        key={ti}
                        className="blank px-0.5"
                        style={{ minWidth: `${t.text.length * 0.55 + 0.6}em` }}
                        onClick={() => tapWord(t)}
                      >
                        {t.text}
                      </span>
                    );
                  }
                  const ok = answers[t.i];
                  return (
                    <motion.span
                      key={ti}
                      initial={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
                      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className={
                        "inline-block rounded-md px-0.5 font-medium " +
                        (ok === undefined
                          ? "text-accent"
                          : ok
                          ? "text-good"
                          : "text-bad")
                      }
                    >
                      {t.text}
                    </motion.span>
                  );
                })}
              </p>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm text-sub">
        Вспомни скрытое слово, затем коснись его для проверки
      </p>
      <SelfCheckBar
        visible={Boolean(pending)}
        text={pending?.text || ""}
        onAnswer={answer}
      />
    </div>
  );
}
