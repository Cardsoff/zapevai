"use client";

// Режим «Пропуски слов»: часть слов скрыта.
// Тап по слову открывает его (= «забыл»). Нетронутые слова = «вспомнил».
// В конце кнопка «Готово» — счёт считается автоматически.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseLyrics, pickHiddenWords } from "@/lib/lyrics";
import { tapFeedback, goodFeedback } from "@/lib/feedback";
import ClozeIntro, { clozeIntroHidden } from "./ClozeIntro";

export default function ClozeTrainer({ lyrics, level, onFinish }) {
  const parsed = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const hidden = useMemo(() => pickHiddenWords(parsed, level), [parsed, level]);

  // null — решаем, показывать ли инструкцию (чтобы не мигало при загрузке)
  const [intro, setIntro] = useState(null);
  const [revealed, setRevealed] = useState({}); // i -> true (открыл = забыл)

  useEffect(() => {
    setIntro(!clozeIntroHidden());
  }, []);

  const total = hidden.size;
  const opened = Object.keys(revealed).length;

  function tapWord(token) {
    if (revealed[token.i]) return;
    tapFeedback();
    setRevealed((r) => ({ ...r, [token.i]: true }));
  }

  function finish() {
    goodFeedback();
    onFinish(Math.round(((total - opened) / total) * 100));
  }

  if (intro === null) return null;
  if (intro) return <ClozeIntro onStart={() => setIntro(false)} />;

  return (
    <div className="pb-32">
      <div className="space-y-6">
        {parsed.sections.map((sec, si) => (
          <div key={si} className="glass rounded-xl3 p-5">
            {sec.lines.map((line, li) => (
              <p key={li} className="mb-2 font-serif text-[17px] leading-relaxed">
                {line.tokens.map((t, ti) => {
                  if (t.type === "sep") return <span key={ti}>{t.text}</span>;
                  if (!hidden.has(t.i)) return <span key={ti}>{t.text}</span>;
                  if (!revealed[t.i]) {
                    return (
                      <span
                        key={ti}
                        className="blank"
                        onClick={() => tapWord(t)}
                      >
                        {t.text}
                      </span>
                    );
                  }
                  return (
                    <motion.span
                      key={ti}
                      initial={{ opacity: 0.5, filter: "blur(5.5px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block rounded-md px-0.5 font-semibold italic text-accent"
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
        Забыл слово — коснись его. Помнишь — иди дальше.
      </p>

      {/* Нижняя панель: счётчик + «Готово» */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="glass rounded-xl3 p-4 shadow-2xl shadow-black/10">
          <p className="mb-3 text-center font-serif text-sm italic text-sub">
            Открыто:{" "}
            <span className="font-bold not-italic text-ink tabular-nums">
              {opened} из {total}
            </span>{" "}
            скрытых
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
