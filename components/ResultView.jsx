"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ProgressRing from "./ProgressRing";
import { finishFeedback } from "@/lib/feedback";
import { getMyReferralCode } from "@/lib/storage";
import { track } from "@/lib/track";

function message(score) {
  if (score >= 95) return { t: "Идеально!", s: "Ты знаешь это наизусть" };
  if (score >= 90) return { t: "Отлично!", s: "Уровень пройден" };
  if (score >= 70) return { t: "Хорошо!", s: "Ещё немного — и получится" };
  if (score >= 40) return { t: "Неплохо", s: "Повтори текст и попробуй снова" };
  return { t: "Только начало", s: "Прочитай текст ещё раз и вернись" };
}

export default function ResultView({ score, songId, songTitle, onRetry }) {
  const msg = message(score);
  const passed = score >= 90;
  const [ref, setRef] = useState(null);

  useEffect(() => {
    finishFeedback();
    getMyReferralCode().then(setRef).catch(() => {});
    const aurora = document.getElementById("aurora");
    if (aurora && passed) {
      aurora.classList.add("warm");
      return () => aurora.classList.remove("warm");
    }
  }, [passed]);

  async function share() {
    track("result_share", { score });
    const url = "https://zapevai.vercel.app" + (ref ? `/?ref=${ref}` : "");
    const text = songTitle
      ? `Учу «${songTitle}» в «Запевай» — уже ${score}% наизусть!`
      : `Учу песни наизусть в «Запевай» — ${score}%!`;
    try {
      if (navigator.share) await navigator.share({ title: "Запевай", text, url });
      else {
        await navigator.clipboard.writeText(text + " " + url);
        alert("Скопировано — отправь друзьям!");
      }
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="flex min-h-[70vh] flex-col items-center justify-center text-center"
    >
      <ProgressRing value={score} size={148} stroke={10} />
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6 font-serif text-4xl font-bold"
      >
        <span className={passed ? "text-gradient" : ""}>{msg.t}</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-sub"
      >
        {msg.s}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-10 flex w-full max-w-xs flex-col gap-3"
      >
        <button
          onClick={onRetry}
          className="w-full rounded-2xl btn-gradient py-3.5 font-semibold active:scale-95 transition-transform"
        >
          Ещё раз
        </button>
        <button
          onClick={share}
          className="flex w-full items-center justify-center gap-2 rounded-2xl glass py-3.5 font-semibold active:scale-95 transition-transform"
        >
          🎤 Поделиться результатом
        </button>
        <Link
          href={`/song/${songId}`}
          className="w-full rounded-2xl glass py-3.5 font-semibold active:scale-95 transition-transform"
        >
          К песне
        </Link>
        <Link href="/" className="py-2 text-sm text-sub">
          На главную
        </Link>
      </motion.div>
    </motion.div>
  );
}
