"use client";

// Экран-инструкция перед тренировкой «Пропуски слов».
// Показывается, пока пользователь не поставит «больше не показывать».

import { useState } from "react";
import { motion } from "framer-motion";

const KEY = "zp_cloze_intro_off";

export function clozeIntroHidden() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export default function ClozeIntro({ onStart }) {
  const [dontShow, setDontShow] = useState(false);

  function start() {
    if (dontShow) localStorage.setItem(KEY, "1");
    onStart();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl3 p-6"
    >
      <h2 className="mb-4 font-serif text-2xl font-bold">Как тренироваться</h2>
      <ol className="mb-5 space-y-3 text-[15px] leading-relaxed">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-card font-serif text-sm font-bold italic">i</span>
          <span>Читай текст и вспоминай скрытые слова про себя.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-card font-serif text-sm font-bold italic">ii</span>
          <span>
            Вспомнил слово — <b>не трогай его</b>. Забыл — коснись, и оно
            откроется.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-card font-serif text-sm font-bold italic">iii</span>
          <span>
            В конце нажми «Готово» — результат посчитается сам: открытые слова
            идут как «забыл», остальные как «вспомнил».
          </span>
        </li>
      </ol>

      <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm text-sub">
        <input
          type="checkbox"
          checked={dontShow}
          onChange={(e) => setDontShow(e.target.checked)}
          className="h-5 w-5 accent-current"
        />
        Больше не показывать
      </label>

      <button
        onClick={start}
        className="w-full rounded-2xl btn-gradient py-3.5 text-base font-semibold active:scale-95 transition-transform"
      >
        Начать
      </button>
    </motion.div>
  );
}
