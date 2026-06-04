"use client";

// Установка нового пароля (по ссылке из письма)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { updatePassword } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const mismatch = p2.length > 0 && p1 !== p2;

  async function submit() {
    if (busy || p1.length < 6 || p1 !== p2) return;
    setBusy(true);
    setMsg(null);
    const { error } = await updatePassword(p1);
    setBusy(false);
    if (error) {
      setMsg(
        error.message ||
          "Не получилось. Открой ссылку из письма ещё раз и попробуй снова."
      );
    } else {
      setMsg("Пароль обновлён! Сейчас откроется песенник…");
      setTimeout(() => router.push("/"), 1200);
    }
  }

  return (
    <main className="pb-safe">
      <Header title="Новый пароль" back={false} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl3 p-5"
      >
        <p className="mb-4 font-serif text-lg font-bold">
          Придумай новый пароль
        </p>
        <div className="space-y-3">
          <input
            type="password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="Новый пароль (минимум 6 символов)"
            className="w-full rounded-xl2 border border-line bg-card px-4 py-3.5 text-[16px]"
          />
          <input
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            placeholder="Повтори пароль"
            className={
              "w-full rounded-xl2 border bg-card px-4 py-3.5 text-[16px] " +
              (mismatch ? "border-bad" : "border-line")
            }
          />
          {mismatch && (
            <p className="px-1 text-xs font-semibold text-bad">
              Пароли не совпадают
            </p>
          )}
        </div>

        {msg && (
          <p className="mt-3 text-center font-serif text-sm italic text-accent">
            {msg}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy || p1.length < 6 || p1 !== p2}
          className="btn-gradient mt-5 w-full rounded-xl2 py-4 font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {busy ? "Сохраняю…" : "Сохранить пароль"}
        </button>
      </motion.div>
    </main>
  );
}
