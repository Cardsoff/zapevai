"use client";

// Вход — в стиле песенника: серифная шапка, бумажная карточка
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import WaveLine from "@/components/Decor";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  supabaseEnabled,
} from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!supabaseEnabled()) {
    return (
      <main>
        <Header title="Вход" />
        <div className="glass rounded-xl3 p-6 text-center">
          <p className="mb-2 font-serif text-3xl italic text-accent">♪</p>
          <p className="font-serif text-lg font-bold">Облако ещё не подключено</p>
          <p className="mt-2 text-sm text-sub">
            Пока работает гостевой режим: песни и прогресс хранятся в этом
            браузере.
          </p>
        </div>
      </main>
    );
  }

  const mismatch = mode === "signup" && password2.length > 0 && password !== password2;

  async function submit() {
    if (busy) return;
    if (mode === "signup" && password !== password2) {
      setMsg("Пароли не совпадают — проверь оба поля.");
      return;
    }
    setBusy(true);
    setMsg(null);
    if (mode === "forgot") {
      const { error } = await resetPassword(email.trim());
      setBusy(false);
      setMsg(
        error
          ? error.message || "Что-то пошло не так"
          : "Письмо со ссылкой для смены пароля отправлено — проверь почту."
      );
      return;
    }
    const fn = mode === "signin" ? signInWithEmail : signUpWithEmail;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setMsg(error.message || "Что-то пошло не так");
    } else if (mode === "signup") {
      setMsg("Готово! Проверь почту и подтверди адрес.");
    } else {
      router.push("/");
    }
  }

  return (
    <main className="pb-safe pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="mb-1 flex items-center gap-3">
        <span className="rule flex-1" />
        <p className="kicker">
          {mode === "signin"
            ? "Вход в песенник"
            : mode === "signup"
            ? "Новый песенник"
            : "Восстановление пароля"}
        </p>
        <span className="rule flex-1" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-center"
      >
        <h1 className="font-serif text-[40px] font-bold leading-tight tracking-tight">
          Запе<span className="italic text-accent">вай</span>
        </h1>
        <p className="font-serif text-[13px] italic text-sub">
          — песни и прогресс сохранятся навсегда
        </p>
      </motion.div>

      <WaveLine className="mb-7 mt-3" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass rounded-xl3 p-5"
      >
        <button
          onClick={() => signInWithGoogle()}
          className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl2 border border-line bg-card py-3.5 font-semibold active:scale-[0.98] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.6 2.8c2.2-2 3.8-5 3.8-8.5z"/>
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.6-2.8c-1 .7-2.4 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2L1.2 17.1C3.1 21.2 7.2 24 12 24z"/>
            <path fill="#FBBC05" d="M4.9 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.2 6.9C.4 8.5 0 10.2 0 12s.4 3.5 1.2 5.1l3.7-2.8z"/>
            <path fill="#EA4335" d="M12 4.6c2.3 0 3.9 1 4.8 1.9l3.2-3.2C18 1.3 15.2 0 12 0 7.2 0 3.1 2.8 1.2 6.9l3.7 2.8c1-3 3.8-5.1 7.1-5.1z"/>
          </svg>
          Продолжить с Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-sub">
          <span className="rule flex-1" />
          <span className="font-serif italic">или по почте</span>
          <span className="rule flex-1" />
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Электронная почта"
            className="w-full rounded-xl2 border border-line bg-card px-4 py-3.5 text-[16px]"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (минимум 6 символов)"
              className="w-full rounded-xl2 border border-line bg-card px-4 py-3.5 text-[16px]"
            />
          )}
          {mode === "signup" && (
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Повтори пароль"
              className={
                "w-full rounded-xl2 border bg-card px-4 py-3.5 text-[16px] " +
                (mismatch ? "border-bad" : "border-line")
              }
            />
          )}
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
          disabled={
            busy ||
            !email ||
            (mode !== "forgot" && password.length < 6) ||
            (mode === "signup" && password !== password2)
          }
          className="btn-gradient mt-5 w-full rounded-xl2 py-4 font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {busy
            ? "Секунду…"
            : mode === "signin"
            ? "Войти"
            : mode === "signup"
            ? "Создать аккаунт"
            : "Отправить ссылку"}
        </button>

        {mode === "signin" && (
          <button
            onClick={() => {
              setMode("forgot");
              setMsg(null);
            }}
            className="mt-3 w-full text-center text-sm text-sub"
          >
            Забыл пароль?
          </button>
        )}
      </motion.div>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMsg(null);
          setPassword2("");
        }}
        className="mt-5 w-full py-2 text-center text-sm text-sub"
      >
        {mode === "signin" ? (
          <>Нет аккаунта? <span className="border-b border-current pb-0.5 font-semibold text-accent">Зарегистрироваться</span></>
        ) : (
          <>Уже есть аккаунт? <span className="border-b border-current pb-0.5 font-semibold text-accent">Войти</span></>
        )}
      </button>
    </main>
  );
}
