"use client";

import { useRouter } from "next/navigation";

export default function Header({ title, back = true, right = null }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 glass">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => router.back()}
            aria-label="Назад"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-lg active:scale-90 transition-transform"
          >
            ‹
          </button>
        )}
        <h1 className="flex-1 truncate font-serif text-xl font-bold">{title}</h1>
        {right}
      </div>
    </header>
  );
}
