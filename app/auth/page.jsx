"use client";

// Вход: Google в один тап или email/пароль
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  supabaseEnabled,
} from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!supabaseEnabled()) {
    return (
      <main>
        <Header title="Вход" />
        <div className="glass rounded-xl3 p-6 text-center">
          <p className="mb-2 text-3xl">🔌</p>
          <p className="font-semibold">Облако ещё не подключено</p>
          <p className="mt-2 text-sm text-sub">
            Пока работает гостевой режим: песни и прогресс хранятся в этом
            браузере. Подключи Supabase (см. README) — и появится вход через
            Google.
          </p>
        </div>
      </main>
    );
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
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
    <main className="pb-safe">
      <Header title="Вход" />

      <div className="mb-6 text-center">
        <p className="text-2xl font-bold">
          С возвращением в <span className="text-gradient">Запевай</span>
        </p>
        <p className="mt-1 text-sm text-sub">
          Песни и прогресс сохранятся навсегда
        </p>
      </div>

      <button
        onClick={() => signInWithGoogle()}
        className="glass mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold active:scale-[0.98] transition-transform"
      >
        <span className="text-lg">G</span> Продолжить с Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-sub">
        <span className="h-px flex-1 bg-line" /> или по почте{" "}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Электронная почта"
          className="glass w-full rounded-xl2 px-4 py-3.5 text-[16px]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль (минимум 6 символов)"
          className="glass w-full rounded-xl2 px-4 py-3.5 text-[16px]"
        />
      </div>

      {msg && <p className="mt-3 text-center text-sm text-accent">{msg}</p>}

      <button
        onClick={submit}
        disabled={busy || !email || password.length < 6}
        className="mt-5 w-full rounded-2xl btn-gradient py-4 font-semibold disabled:opacity-40"
      >
        {busy
          ? "Секунду…"
          : mode === "signin"
          ? "Войти"
          : "Создать аккаунт"}
      </button>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full py-2 text-sm text-sub"
      >
        {mode === "signin"
          ? "Нет аккаунта? Зарегистрироваться"
          : "Уже есть аккаунт? Войти"}
      </button>
    </main>
  );
}
