"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header({ title, back = true, right = null }) {
  const router = useRouter();

  function goBack() {
    // если истории нет (страница открыта напрямую) — ведём на главную
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      // подстраховка: если через полсекунды остались на месте — на главную
      const here = window.location.pathname;
      setTimeout(() => {
        if (window.location.pathname === here) router.push("/");
      }, 600);
    } else {
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 glass">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={goBack}
            aria-label="Назад"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-lg active:scale-90 transition-transform"
          >
            ‹
          </button>
        )}
        <h1 className="flex-1 truncate font-serif text-xl font-bold">{title}</h1>
        {right}
        <Link
          href="/"
          aria-label="На главную"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card active:scale-90 transition-transform"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
