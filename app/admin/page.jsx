"use client";

// Админ-панель: массовая загрузка песен в общую базу
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  isAdmin,
  adminBulkAddSongs,
  adminListUsers,
  adminSetPlan,
  adminStats,
  adminUserSongs,
} from "@/lib/storage";
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
  const [users, setUsers] = useState(null);
  const [tab, setTab] = useState("stats"); // stats | users | upload
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null); // user_id раскрытой карточки
  const [userSongs, setUserSongs] = useState({}); // user_id -> песни

  useEffect(() => {
    isAdmin().then((ok) => {
      setAllowed(ok);
      if (ok) {
        adminListUsers().then(setUsers);
        adminStats().then(setStats);
      }
    });
  }, []);

  async function toggleExpand(u) {
    if (expanded === u.user_id) {
      setExpanded(null);
      return;
    }
    setExpanded(u.user_id);
    if (!userSongs[u.user_id]) {
      const songs = await adminUserSongs(u.user_id);
      setUserSongs((m) => ({ ...m, [u.user_id]: songs }));
    }
  }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function togglePlan(u) {
    const next = u.plan === "pro" ? "free" : "pro";
    if (
      next === "free" &&
      !window.confirm(`Снять Про у ${u.email}? Останется 1 песня без удаления.`)
    )
      return;
    setUsers((list) =>
      list.map((x) => (x.user_id === u.user_id ? { ...x, plan: next } : x))
    );
    const { error } = await adminSetPlan(u.user_id, next);
    if (error) {
      setUsers((list) =>
        list.map((x) => (x.user_id === u.user_id ? { ...x, plan: u.plan } : x))
      );
    }
  }

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
      <Header title="Админ" />

      {/* Вкладки */}
      <div className="mb-5 flex gap-2">
        {[
          { id: "stats", name: "Статистика" },
          { id: "users", name: "Люди" },
          { id: "upload", name: "Загрузка" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex-1 rounded-xl2 border py-2.5 text-sm font-semibold transition-all " +
              (tab === t.id
                ? "border-accent bg-accent text-white"
                : "border-line bg-card")
            }
          >
            {t.name}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        stats === null ? (
          <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
            Загрузка…
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {[
                { v: stats.total_users, l: "всего регистраций", e: "👥" },
                { v: stats.active_week, l: "активны за неделю", e: "🔥" },
                { v: stats.today, l: "сегодня", e: "📅" },
                { v: stats.week, l: "за 7 дней", e: "📈" },
                { v: stats.pro_users, l: "с тарифом Про", e: "⭐" },
                { v: stats.total_songs, l: "песен в базе", e: "🎵" },
              ].map((c) => (
                <div key={c.l} className="glass rounded-xl2 p-4">
                  <p className="text-base">{c.e}</p>
                  <p className="font-serif text-3xl font-bold italic text-accent tabular-nums">
                    {c.v}
                  </p>
                  <p className="text-xs text-sub">{c.l}</p>
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-serif text-xl font-bold">Регистрации по дням</h2>
              <span className="rule flex-1" />
            </div>
            <div className="glass rounded-xl2 p-4">
              {(stats.by_day || []).length === 0 ? (
                <p className="py-4 text-center font-serif text-sm italic text-sub">
                  Пока нет данных за две недели
                </p>
              ) : (
                <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                  {stats.by_day.map((d) => {
                    const max = Math.max(...stats.by_day.map((x) => x.n));
                    const h = max > 0 ? Math.round((d.n / max) * 96) + 8 : 8;
                    return (
                      <div
                        key={d.day}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <span className="text-[10px] font-semibold tabular-nums text-sub">
                          {d.n}
                        </span>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: h,
                            background:
                              "linear-gradient(180deg, var(--wine), var(--gold))",
                          }}
                        />
                        <span className="text-[9px] text-sub">
                          {new Date(d.day).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )
      )}

      {tab === "users" && (
      <>
      {/* Пользователи и тарифы */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Пользователи</h2>
        <span className="rule flex-1" />
        {users && (
          <span className="font-serif text-sm italic text-sub">
            {users.length}
          </span>
        )}
      </div>
      {users === null ? (
        <div className="glass mb-6 animate-pulse rounded-xl2 p-5 text-center text-sub">
          Загрузка…
        </div>
      ) : (
        <div className="mb-8 space-y-2">
          {users.map((u) => (
            <div key={u.user_id} className="glass rounded-xl2 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(u)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-semibold">
                    {u.email || "без почты"}
                  </span>
                  <span className="block text-xs text-sub">
                    рег. {fmtDate(u.created_at)} ·{" "}
                    {u.songs_count} {u.songs_count === 1 ? "песня" : "песен"} ·{" "}
                    <span
                      className={
                        u.plan === "pro" ? "font-semibold text-good" : ""
                      }
                    >
                      {u.plan === "pro" ? "Про" : "Бесплатный"}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => togglePlan(u)}
                  className={
                    "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all " +
                    (u.plan === "pro"
                      ? "border-line bg-card text-sub"
                      : "border-accent bg-accent text-white")
                  }
                >
                  {u.plan === "pro" ? "Снять Про" : "Выдать Про"}
                </button>
                <button
                  onClick={() => toggleExpand(u)}
                  className="shrink-0 text-sub"
                  aria-label="Подробнее"
                >
                  {expanded === u.user_id ? "▲" : "▼"}
                </button>
              </div>

              {expanded === u.user_id && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="mb-1 text-xs text-sub">
                    Последний вход: {fmtDate(u.last_sign_in_at)}
                  </p>
                  <p className="mb-2 kicker !text-[10px]">Песни в библиотеке</p>
                  {userSongs[u.user_id] === undefined ? (
                    <p className="text-xs text-sub">Загрузка…</p>
                  ) : userSongs[u.user_id].length === 0 ? (
                    <p className="font-serif text-sm italic text-sub">
                      Пока нет песен
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {userSongs[u.user_id].map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span>{s.learned ? "🏆" : "🎵"}</span>
                          <span className="min-w-0 flex-1 truncate">
                            <b>{s.title}</b>
                            {s.artist ? ` — ${s.artist}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </>
      )}

      {tab === "upload" && (
      <>

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
      </>
      )}
    </main>
  );
}
