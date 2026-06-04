"use client";

import { motion } from "framer-motion";

// Тонкая полоса прогресса тренировки вверху экрана
export default function TrainProgress({ done, total }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
      <motion.div
        className="h-full rounded-full btn-gradient"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      />
    </div>
  );
}
