"use client";

// Профиль: статистика, звук, аккаунт
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  getStats,
  listLearnedSongs,
  getPlan,
  getMyReferralCode,
  getMyProfile,
  updateMyProfile,
  sendSuggestion,
  ADMIN_EMAILS,
} from "@/lib/storage";
import {
  getUser,
  signOut,
  supabaseEnabled,
  updatePassword,
  changeEmail,
} from "@/lib/supabase";
import { toggleSound, soundEnabled } from "@/lib/feedback";
import { track } from "@/lib/track";

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ streak: 0, best: 0, totalSongs: 0, mastered: 0 });
  const [learned, setLearned] = useState(null);
  const [user, setUser] = useState(null);
  const [sound, setSound] = useState(true);
  const [theme, setTheme] = useState("light");
  const [plan, setPlan] = useState(null);
  const [showLearned, setShowLearned] = useState(false);
  const [form, setForm] = useState(null); // {name, city, about}
  const [formMsg, setFormMsg] = useState(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [secMsg, setSecMsg] = useState(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaText, setIdeaText] = useState("");
  const [ideaMsg, setIdeaMsg] = useState(null);
  const [ideaFile, setIdeaFile] = useState(null);
  const [refCode, setRefCode] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
    listLearnedSongs().then(setLearned);
    getPlan().then(setPlan);
    getMyProfile().then((pr) => {
      if (pr) setForm({ name: pr.name || "", city: pr.city || "", about: pr.about || "" });
    });
    getMyReferralCode().then(setRefCode);
    getUser().then(setUser);
    setSound(soundEnabled());
    try {
      setTheme(localStorage.getItem("zp_theme") || "light");
    } catch {}
  }, []);

  function applyTheme(t) {
    setTheme(t);
    try {
      localStorage.setItem("zp_theme", t);
    } catch {}
    if (t === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", t);
    }
  }

  return (
    <main className="pb-safe">
      <Header title="Профиль" />

      {/* Статистика */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { v: stats.streak, l: "дней подряд", e: "🔥" },
          { v: stats.totalSongs, l: "песен", e: "🎵" },
          { v: stats.mastered, l: "наизусть", e: "🏆" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-xl2 p-4 text-center">
            <p className="text-lg">{s.e}</p>
            <p className="font-serif text-3xl font-bold italic text-accent tabular-nums">{s.v}</p>
            <p className="text-xs text-sub">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Выучено наизусть — сворачиваемый список */}
      <button
        onClick={() => setShowLearned(!showLearned)}
        className="glass mb-3 flex w-full items-center gap-3 rounded-xl2 p-4 active:scale-[0.99] transition-transform"
      >
        <span className="font-serif text-lg italic text-accent">🏆</span>
        <span className="flex-1 text-left font-serif text-lg font-bold">
          Выучено наизусть
        </span>
        <span className="font-serif text-base italic text-accent tabular-nums">
          {learned === null ? "…" : learned.length}
        </span>
        <span className="text-sub">{showLearned ? "▲" : "▼"}</span>
      </button>
      {showLearned && learned !== null && (learned.length === 0 ? (
        <div className="glass mb-6 rounded-xl2 p-5 text-center">
          <p className="font-serif text-sm italic text-sub">
            Здесь появятся песни, которые ты отметишь как выученные
          </p>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          {learned.map((s) => (
            <Link
              key={s.id}
              href={`/song/${s.id}`}
              className="glass spine flex items-center gap-3 rounded-xl2 p-4 pl-5 active:scale-[0.98] transition-transform"
            >
              <span className="min-w-0 flex-1">
                <span className="kicker block truncate !text-[10px]">
                  {s.artist || "Без исполнителя"}
                </span>
                <span className="block truncate font-serif text-[16px] font-bold">
                  {s.title}
                </span>
              </span>
              <span className="text-sub">›</span>
            </Link>
          ))}
        </div>
      ))}

      {/* Тариф */}
      {plan && (
        <div className="glass spine mb-6 rounded-xl2 p-4 pl-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker !text-[10px]">Тариф</p>
              <p className="font-serif text-xl font-bold">
                {plan === "pro" ? "Запевай Про" : "Бесплатный"}
              </p>
            </div>
            {plan === "pro" ? (
              <span className="rounded-full bg-good/15 px-3 py-1 text-xs font-semibold text-good">
                ✓ активен
              </span>
            ) : (
              <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-sub">
                базовый
              </span>
            )}
          </div>
          {plan === "free" && (
            <p className="mt-2 text-xs text-sub">
              Одна песня и режим «Пропуски». В Про: безлимит песен, все режимы
              и удаление. Оплата скоро — следи за обновлениями.
            </p>
          )}
        </div>
      )}

      {/* Анкета */}
      {user && form && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-serif text-xl font-bold">Анкета</h2>
            <span className="rule flex-1" />
          </div>
          <div className="glass mb-6 space-y-3 rounded-xl2 p-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Имя"
              className="w-full rounded-xl2 border border-line bg-card px-4 py-3 text-[16px]"
            />
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Город"
              className="w-full rounded-xl2 border border-line bg-card px-4 py-3 text-[16px]"
            />
            <textarea
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="О себе (пара слов)"
              rows={2}
              className="w-full resize-none rounded-xl2 border border-line bg-card px-4 py-3 text-[16px]"
            />
            {formMsg && (
              <p className="text-center font-serif text-sm italic text-good">
                {formMsg}
              </p>
            )}
            <button
              onClick={async () => {
                const r = await updateMyProfile(form);
                setFormMsg(r.error ? "Не сохранилось, попробуй ещё" : "Сохранено ✓");
                setTimeout(() => setFormMsg(null), 2500);
              }}
              className="btn-gradient w-full rounded-xl2 py-3 font-semibold active:scale-[0.98] transition-transform"
            >
              Сохранить анкету
            </button>
          </div>

          {/* Безопасность */}
          <button
            onClick={() => setShowSecurity(!showSecurity)}
            className="glass mb-3 flex w-full items-center gap-3 rounded-xl2 p-4 active:scale-[0.99] transition-transform"
          >
            <span className="flex-1 text-left font-serif text-lg font-bold">
              Пароль и почта
            </span>
            <span className="text-sub">{showSecurity ? "▲" : "▼"}</span>
          </button>
          {showSecurity && (
            <div className="glass mb-6 space-y-3 rounded-xl2 p-4">
              <p className="kicker !text-[10px]">Новый пароль</p>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Новый пароль (минимум 6 символов)"
                className="w-full rounded-xl2 border border-line bg-card px-4 py-3 text-[16px]"
              />
              <input
                type="password"
                value={newPass2}
                onChange={(e) => setNewPass2(e.target.value)}
                placeholder="Повтори пароль"
                className={
                  "w-full rounded-xl2 border bg-card px-4 py-3 text-[16px] " +
                  (newPass2 && newPass !== newPass2 ? "border-bad" : "border-line")
                }
              />
              <button
                onClick={async () => {
                  if (newPass.length < 6 || newPass !== newPass2) return;
                  const { error } = await updatePassword(newPass);
                  setSecMsg(error ? "Не получилось: " + error.message : "Пароль обновлён ✓");
                  if (!error) {
                    setNewPass("");
                    setNewPass2("");
                  }
                }}
                disabled={newPass.length < 6 || newPass !== newPass2}
                className="btn-gradient w-full rounded-xl2 py-3 font-semibold disabled:opacity-40"
              >
                Сменить пароль
              </button>

              <p className="kicker pt-2 !text-[10px]">Сменить почту</p>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Новая почта"
                className="w-full rounded-xl2 border border-line bg-card px-4 py-3 text-[16px]"
              />
              <button
                onClick={async () => {
                  if (!newEmail.includes("@")) return;
                  const { error } = await changeEmail(newEmail);
                  setSecMsg(
                    error
                      ? "Не получилось: " + error.message
                      : "Письмо для подтверждения отправлено на новую почту"
                  );
                  if (!error) setNewEmail("");
                }}
                disabled={!newEmail.includes("@")}
                className="glass w-full rounded-xl2 py-3 font-semibold disabled:opacity-40"
              >
                Сменить почту
              </button>
              {secMsg && (
                <p className="text-center font-serif text-sm italic text-accent">
                  {secMsg}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Настройки */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Настройки</h2>
        <span className="rule flex-1" />
      </div>
      <div className="glass mb-3 rounded-xl2 p-4">
        <p className="mb-3 font-semibold">Тема</p>
        <div className="flex gap-2">
          {[
            { id: "light", name: "Бумага" },
            { id: "dark", name: "Тёмная" },
            { id: "black", name: "Чёрная" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={
                "flex-1 rounded-xl2 border py-2.5 text-sm font-semibold transition-all " +
                (theme === t.id
                  ? "border-accent bg-accentDeep text-white"
                  : "border-line bg-card")
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setSound(toggleSound())}
        className="glass mb-6 flex w-full items-center justify-between rounded-xl2 p-4 active:scale-[0.99] transition-transform"
      >
        <span className="font-semibold">Звуки успеха</span>
        <span
          className={
            "flex h-7 w-12 items-center rounded-full px-1 transition-colors " +
            (sound ? "bg-good" : "bg-line")
          }
        >
          <span
            className={
              "h-5 w-5 rounded-full bg-white shadow transition-transform " +
              (sound ? "translate-x-5" : "")
            }
          />
        </span>
      </button>

      {/* Аккаунт */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-serif text-xl font-bold">Аккаунт</h2>
        <span className="rule flex-1" />
      </div>
      {user ? (
        <div className="glass rounded-xl2 p-4">
          <p className="mb-1 font-semibold">{user.email}</p>
          <p className="mb-4 text-sm text-sub">
            Песни и прогресс сохраняются в облаке
          </p>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="w-full rounded-xl2 bg-bad/10 py-3 font-semibold text-bad"
          >
            Выйти
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl2 p-4">
          <p className="mb-1 font-semibold">Гостевой режим</p>
          <p className="mb-4 text-sm text-sub">
            Всё хранится в этом браузере.{" "}
            {supabaseEnabled()
              ? "Войди — и репертуар с прогрессом останется навсегда."
              : "Облако появится после подключения Supabase."}
          </p>
          {supabaseEnabled() && (
            <Link
              href="/auth"
              className="block w-full rounded-xl2 btn-gradient py-3 text-center font-semibold"
            >
              Войти
            </Link>
          )}
        </div>
      )}

      {user && ADMIN_EMAILS.includes(user.email) && (
        <Link
          href="/admin"
          className="glass mt-4 block rounded-xl2 p-4 text-center font-semibold active:scale-[0.99] transition-transform"
        >
          🛠 Админ-панель
        </Link>
      )}

      {/* Предложить улучшение */}
      {user && (
        <>
          <button
            onClick={() => setIdeaOpen(!ideaOpen)}
            className="glass mt-4 w-full rounded-xl2 py-3.5 font-semibold active:scale-[0.98] transition-transform"
          >
            💡 Предложить улучшение
          </button>
          {ideaOpen && (
            <div className="glass mt-2 rounded-xl2 p-4">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={3}
                placeholder="Чего не хватает? Что сделать удобнее?"
                className="w-full resize-none rounded-xl2 border border-line bg-card px-3 py-2.5 text-[15px]"
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl2 border border-dashed border-line px-3 py-2.5 text-sm text-sub">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdeaFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                📎{" "}
                {ideaFile
                  ? `${ideaFile.name.slice(0, 28)} ✓`
                  : "Приложить скриншот (по желанию)"}
              </label>
              <button
                onClick={async () => {
                  if (ideaText.trim().length < 3) return;
                  const r = await sendSuggestion(ideaText, ideaFile);
                  if (!r.error) {
                    setIdeaMsg("Спасибо! Предложение у редакции ✓");
                    setIdeaText("");
                    setIdeaFile(null);
                    setIdeaOpen(false);
                    setTimeout(() => setIdeaMsg(null), 3000);
                  }
                }}
                disabled={ideaText.trim().length < 3}
                className="btn-gradient mt-2 w-full rounded-xl2 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Отправить
              </button>
            </div>
          )}
          {ideaMsg && (
            <p className="mt-2 text-center font-serif text-sm italic text-good">
              {ideaMsg}
            </p>
          )}
        </>
      )}

      <button
        onClick={async () => {
          const data = {
            title: "Запевай",
            text: "Я учу песни наизусть в «Запевай» — присоединяйся!",
            url:
              "https://zapevai.vercel.app" +
              (refCode ? `/?ref=${refCode}` : ""),
          };
          try {
            track("invite_share");
            if (navigator.share) await navigator.share(data);
            else {
              await navigator.clipboard.writeText(data.text + " " + data.url);
              alert("Ссылка скопирована — отправь друзьям!");
            }
          } catch {}
        }}
        className="btn-gradient mt-4 w-full rounded-xl2 py-3.5 font-semibold active:scale-[0.98] transition-transform"
      >
        🎤 Позвать друзей
      </button>

      {/* Подпись с реф-ссылкой скрыта до запуска монетизации; шеринг использует её автоматически */}

      <p className="mt-8 text-center text-xs text-sub">
        Запевай · учи песни с удовольствием ·{" "}
        <Link href="/terms" className="underline">
          условия
        </Link>
      </p>
    </main>
  );
}
