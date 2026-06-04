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
  adminSongs,
  adminDeleteSong,
  adminReports,
  adminDeleteReport,
} from "@/lib/storage";
import { normalizeMeta } from "@/lib/lyrics";
import Link from "next/link";
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
  const [tab, setTab] = useState("stats"); // stats | users | songs | reports | upload
  const [allSongs, setAllSongs] = useState(null);
  const [songQuery, setSongQuery] = useState("");
  const [reports, setReports] = useState(null);
  const [period, setPeriod] = useState(null); // дней; null = всё время
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null); // user_id раскрытой карточки
  const [userSongs, setUserSongs] = useState({}); // user_id -> песни

  useEffect(() => {
    isAdmin().then((ok) => {
      setAllowed(ok);
      if (ok) {
        adminListUsers().then(setUsers);
        adminStats(null).then(setStats);
        adminSongs().then(setAllSongs);
        adminReports().then(setReports);
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

  async function changePeriod(days) {
    setPeriod(days);
    setStats(null);
    setStats(await adminStats(days));
  }

  async function deleteSong(sng) {
    if (
      !window.confirm(
        `Удалить «${sng.title}» из базы? Она пропадёт у ${sng.users_count} пользователей вместе с прогрессом.`
      )
    )
      return;
    const { error } = await adminDeleteSong(sng.id);
    if (!error) setAllSongs((l) => l.filter((x) => x.id !== sng.id));
  }

  async function resolveReport(id) {
    await adminDeleteReport(id);
    setReports((l) => l.filter((r) => r.id !== id));
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
      <div className="mb-5 flex flex-wrap gap-1.5">
        {[
          { id: "stats", name: "Сводка" },
          { id: "users", name: "Люди" },
          { id: "songs", name: "Песни" },
          { id: "reports", name: "Замечания", badge: (reports || []).length },
          { id: "upload", name: "Загрузка" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "rounded-xl2 border px-3 py-2 text-xs font-semibold transition-all " +
              (tab === t.id
                ? "border-accent bg-accent text-white"
                : "border-line bg-card")
            }
          >
            {t.name}
            {t.badge > 0 && (
              <span className="ml-1 rounded-full bg-bad px-1.5 text-[10px] text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <>
          {/* Период */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[
              { d: 1, n: "День" },
              { d: 7, n: "Неделя" },
              { d: 30, n: "Месяц" },
              { d: 90, n: "3 мес" },
              { d: 182, n: "Полгода" },
              { d: 365, n: "Год" },
              { d: null, n: "Всё время" },
            ].map((p) => (
              <button
                key={p.n}
                onClick={() => changePeriod(p.d)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all " +
                  (period === p.d
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-card")
                }
              >
                {p.n}
              </button>
            ))}
          </div>

        {stats === null ? (
          <div className="glass animate-pulse rounded-xl3 p-10 text-center text-sub">
            Загрузка…
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {[
                { v: stats.regs, l: period === null ? "всего регистраций" : "новых регистраций", e: "👥" },
                { v: stats.active, l: "активных", e: "🔥" },
                { v: stats.pro, l: "с тарифом Про", e: "⭐" },
                { v: stats.songs, l: "новых песен", e: "🎵" },
              ].map((c) => (
                <div key={c.l} className="glass rounded-xl2 p-4">
                  <p className="text-base">{c.e}</p>
                  <p className="font-serif text-3xl font-bold italic text-accent tabular-nums">
                    {period === null ? c.v : "+" + c.v}
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
        )}
        </>
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
                    Последний вход: {fmtDate(u.last_sign_in_at)} · пригласил:{" "}
                    {u.invited_count ?? 0}
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

      {tab === "songs" && (
        <>
          <input
            value={songQuery}
            onChange={(e) => setSongQuery(e.target.value)}
            placeholder="Поиск по базе песен"
            className="glass mb-3 w-full rounded-xl2 px-4 py-3 text-[16px]"
          />
          {allSongs === null ? (
            <div className="glass animate-pulse rounded-xl2 p-5 text-center text-sub">
              Загрузка…
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const counts = {};
                allSongs.forEach((x) => {
                  const k = normalizeMeta(x.title);
                  counts[k] = (counts[k] || 0) + 1;
                });
                const q = songQuery.toLowerCase();
                return allSongs
                  .filter(
                    (x) =>
                      !q ||
                      x.title.toLowerCase().includes(q) ||
                      (x.artist || "").toLowerCase().includes(q)
                  )
                  .map((x) => (
                    <div
                      key={x.id}
                      className="glass flex items-center gap-3 rounded-xl2 p-3.5 pl-4"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-serif text-[15px] font-bold">
                            {x.title}
                          </span>
                          {counts[normalizeMeta(x.title)] > 1 && (
                            <span className="shrink-0 rounded-full bg-bad/10 px-2 py-0.5 text-[10px] font-semibold text-bad">
                              дубль?
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-sub">
                          {x.artist || "Без исполнителя"} · у {x.users_count}{" "}
                          польз. · {fmtDate(x.created_at)}
                          {x.reports_count > 0 && (
                            <span className="font-semibold text-bad">
                              {" "}· ⚠ {x.reports_count}
                            </span>
                          )}
                        </span>
                      </span>
                      <Link
                        href={`/song/${x.id}`}
                        className="shrink-0 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold"
                      >
                        Открыть
                      </Link>
                      <button
                        onClick={() => deleteSong(x)}
                        className="shrink-0 rounded-xl bg-bad/10 px-3 py-1.5 text-xs font-semibold text-bad"
                      >
                        Удалить
                      </button>
                    </div>
                  ));
              })()}
            </div>
          )}
        </>
      )}

      {tab === "reports" && (
        <>
          {reports === null ? (
            <div className="glass animate-pulse rounded-xl2 p-5 text-center text-sub">
              Загрузка…
            </div>
          ) : reports.length === 0 ? (
            <div className="glass rounded-xl2 p-6 text-center">
              <p className="font-serif text-sm italic text-sub">
                Замечаний нет — тишина и гармония ♪
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="glass rounded-xl2 p-4">
                  <p className="font-serif text-[15px] font-bold">
                    {r.song_title || "(песня удалена)"}
                    {r.song_artist ? (
                      <span className="font-sans text-xs font-normal text-sub">
                        {" "}— {r.song_artist}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm">{r.comment}</p>
                  <p className="mt-1 text-xs text-sub">
                    {r.email || "аноним"} · {fmtDate(r.created_at)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {r.song_id && (
                      <Link
                        href={`/song/${r.song_id}`}
                        className="flex-1 rounded-xl border border-line bg-card py-2 text-center text-xs font-semibold"
                      >
                        Открыть песню
                      </Link>
                    )}
                    <button
                      onClick={() => resolveReport(r.id)}
                      className="flex-1 rounded-xl bg-good/10 py-2 text-xs font-semibold text-good"
                    >
                      ✓ Решено
                    </button>
                  </div>
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
