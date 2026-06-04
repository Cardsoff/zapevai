"use client";

import { motion, AnimatePresence } from "framer-motion";
import { goodFeedback, badFeedback } from "@/lib/feedback";

// Панель самопроверки: после открытия слова/строки спрашиваем «Помнил?»
export default function SelfCheckBar({ visible, text, onAnswer }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
          <div className="glass rounded-xl3 p-4 shadow-2xl shadow-black/10">
            <p className="mb-3 text-center text-sm text-sub">
              <span className="font-semibold text-ink">«{text}»</span> — помнил
              это?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  badFeedback();
                  onAnswer(false);
                }}
                className="flex-1 rounded-2xl bg-bad/10 py-3.5 text-base font-semibold text-bad active:scale-95 transition-transform"
              >
                Забыл
              </button>
              <button
                onClick={() => {
                  goodFeedback();
                  onAnswer(true);
                }}
                className="flex-1 rounded-2xl bg-good/10 py-3.5 text-base font-semibold text-good active:scale-95 transition-transform"
              >
                Помнил
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
