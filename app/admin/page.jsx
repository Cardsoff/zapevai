"use client";

// Админ-панель: массовая загрузка песен в общую базу
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { isAdmin, adminBulkAddSongs } from "@/lib/storage";
import { parseLyrics } from "@/lib/lyrics";

const TEMPLATE = `Название песни — Исполнитель
Первая строка текста
Вторая строка текста

Второй куплет после пустой строки
===
Следующая песня — Другой исполнитель
Текст следующей песни…`;

// Разбор пачки: песни разделены строкой ===, первая строка — «Название — Исполнитель»
function parseBatch(raw) {
  const blocks = (raw || "")
    .replace(/\r\n/g, "\n")
    .split(/\n={3,}\n?/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const head = (lines.shift() || "").trim();
    const m = head.split(/\s+[—|-]\s+/);
    const title = (m[0] || "").trim();
    const artist = (m[1] || "").trim();
    const lyrics = lines.join("\n").trim();
    const words = parseLyrics(lyrics).totalWords;
    return {
      title,
      artist,
      lyrics,
      words,
      valid: title.length > 0 && words >= 10,
    };
  });
}

export default function AdminPage() {
  const [allowed, setAllowed] = useState(null);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    isAdmin().then(setAllowed);
  }, []);

  if (allowed === null) {
    return (
      <main>
        <Header title="Админ" />
        <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
          Загрузка…
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main>
        <Header title="Админ" />
        <div className="glass rounded-xl3 p-8 text-center">
          <p className="mb-1 font-serif text-3xl italic text-accent">♪</p>
          <p className="font-serif text-lg font-bold">Только для редакции</p>
          <p className="mt-2 text-sm text-sub">
            Войди под админским аккаунтом, чтобы загружать песни в общую базу.
          </p>
        </div>
      </main>
    );
  }

  const parsed = parseBatch(raw);
  const valid = parsed.filter((p) => p.valid);

  async function upload() {
    if (busy || valid.length === 0) return;
    setBusy(true);
    setResults(null);
    const res = await adminBulkAddSongs(valid);
    setResults(res);
    setBusy(false);
  }

  return (
    <main className="pb-safe">
      <Header title="Массовая загрузка" />

      <div className="glass mb-4 rounded-xl2 p-4 text-sm text-sub">
        <p className="mb-2 font-semibold text-ink">Шаблон</p>
        <p className="mb-2">
          Первая строка песни: <b>Название — Исполнитель</b>. Дальше текст.
          Между песнями строка <b>===</b>
        </p>
        <button
          onClick={() => setRaw(TEMPLATE)}
          className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold"
        >
          Вставить пример
        </button>
      </div>

      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setResults(null);
        }}
        placeholder="Вставь пачку песен по шаблону…"
        rows={14}
        className="glass w-full resize-none rounded-xl2 px-4 py-3.5 font-serif text-[15px] leading-relaxed"
      />

      {/* Предпросмотр */}
      {parsed.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {parsed.map((p, i) => (
            <div
              key={i}
              className={
                "glass flex items-center gap-3 rounded-xl2 px-4 py-2.5 text-sm " +
                (p.valid ? "" : "opacity-60")
              }
            >
              <span className="font-serif italic text-sub">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate">
                <b>{p.title || "Без названия"}</b>
                {p.artist ? ` — ${p.artist}` : ""}
              </span>
              <span className={"shrink-0 text-xs " + (p.valid ? "text-sub" : "text-bad")}>
                {p.valid ? `${p.words} слов` : p.title ? "мало слов" : "нет названия"}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={upload}
        disabled={busy || valid.length === 0}
        className="btn-gradient mt-4 w-full rounded-xl2 py-4 font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        {busy
          ? "Загружаю…"
          : `Загрузить в базу${valid.length ? ` (${valid.length})` : ""}`}
      </button>

      {/* Отчёт */}
      {results && (
        <div className="mt-4 space-y-1.5">
          {results.map((r, i) => (
            <div
              key={i}
              className="glass flex items-center gap-3 rounded-xl2 px-4 py-2.5 text-sm"
            >
              <span>
                {r.status === "added" ? "✅" : r.status === "duplicate" ? "📋" : "⚠️"}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
              <span className="shrink-0 text-xs text-sub">
                {r.status === "added"
                  ? "добавлена"
                  : r.status === "duplicate"
                  ? "уже в базе"
                  : r.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
