"use client";

// Лендинг — первый экран для новых гостей: оффер, вход, о приложении
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import WaveLine from "./Decor";
import { tapFeedback } from "@/lib/feedback";

// интерактивная строка с «пропусками» — мини-демо тренажёра
const DEMO = [
  { t: "Выучи", hidden: false },
  { t: "любую", hidden: true },
  { t: "песню", hidden: false },
  { t: "наизусть", hidden: true },
];

export default function Landing({ onTry }) {
  const [open, setOpen] = useState({});
  const allOpen = useMemo(
    () => DEMO.every((w, i) => !w.hidden || open[i]),
    [open]
  );

  return (
    <main className="flex min-h-[100svh] flex-col pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
      {/* Шапка */}
      <div className="mb-8 flex items-center gap-3">
        <span className="rule flex-1" />
        <p className="kicker">Песенник · Запевай</p>
        <span className="rule flex-1" />
      </div>

      {/* Оффер */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-[44px] font-bold leading-[1.08] tracking-tight"
        >
          {DEMO.map((w, i) =>
            !w.hidden ? (
              <span key={i}>{w.t} </span>
            ) : open[i] ? (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className="italic text-accent"
              >
                {w.t}{" "}
              </motion.span>
            ) : (
              <span
                key={i}
                onClick={() => {
                  tapFeedback();
                  setOpen((o) => ({ ...o, [i]: true }));
                }}
                className="blank cursor-pointer px-1"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                {w.t}{" "}
              </span>
            )
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 font-serif text-[15px] italic text-sub"
        >
          {allOpen
            ? "— вот так и тренируемся: забыл слово — коснись его"
            : "— коснись скрытых слов, чтобы открыть"}
        </motion.p>

        <WaveLine className="mt-6 max-w-xs" />

        {/* Кнопки */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 w-full max-w-sm space-y-3"
        >
          <Link
            href="/auth"
            className="btn-gradient block w-full rounded-2xl py-4 text-center text-base font-semibold shadow-xl shadow-accent/25 active:scale-[0.98] transition-transform"
          >
            Создать песенник
          </Link>
          <button
            onClick={onTry}
            className="glass block w-full rounded-2xl py-4 text-center text-base font-semibold active:scale-[0.98] transition-transform"
          >
            Попробовать без регистрации
          </button>
        </motion.div>
      </div>

      {/* О приложении */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 grid grid-cols-3 gap-2"
      >
        {[
          { e: "✦", t: "Пропуски слов", d: "5 уровней — от разминки до «наизусть»" },
          { e: "↻", t: "Умные повторения", d: "напомним, когда память начнёт таять" },
          { e: "♪", t: "Общая база", d: "песни добавляются один раз — для всех" },
        ].map((f) => (
          <div key={f.t} className="glass rounded-xl2 p-3.5 text-center">
            <p className="font-serif text-xl italic text-accent">{f.e}</p>
            <p className="mt-1 font-serif text-[13px] font-bold leading-tight">
              {f.t}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-sub">{f.d}</p>
          </div>
        ))}
      </motion.div>

      <p className="mt-4 text-center text-[11px] text-sub">
        Тексты добавляют пользователи для личного обучения ·{" "}
        <Link href="/terms" className="underline">
          условия
        </Link>
      </p>
    </main>
  );
}
