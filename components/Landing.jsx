"use client";

// Лендинг-сторис: свайп-слайды для новых гостей
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tapFeedback } from "@/lib/feedback";
import { track } from "@/lib/track";

const N = 8;

export default function Landing({ onTry }) {
  const router = useRouter();
  const [cur, setCur] = useState(0);
  const [fog, setFog] = useState({});
  const [gaps, setGaps] = useState({});
  const [mode, setMode] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const rootRef = useRef(null);
  const drag = useRef({ x: 0, y: 0, on: false, moved: false });
  const timers = useRef([]);

  useEffect(() => {
    track("landing_view");
  }, []);

  // перезапуск входных анимаций активного слайда + авто-открытие слайда 2
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const slide = root.querySelector(`.slide[data-i="${cur}"]`);
    if (slide) {
      slide.querySelectorAll(".anim").forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (cur === 0) {
      setFog({});
      timers.current.push(setTimeout(() => setFog((f) => ({ ...f, 0: true })), 1100));
      timers.current.push(setTimeout(() => setFog((f) => ({ ...f, 1: true })), 1900));
    }
    if (cur === 1) {
      setGaps({});
      [0, 1, 2, 3].forEach((k) => {
        timers.current.push(
          setTimeout(() => setGaps((g) => ({ ...g, [k]: true })), 900 + k * 650)
        );
      });
    }
    return () => timers.current.forEach(clearTimeout);
  }, [cur]);

  useEffect(() => {
    if (cur !== 3 || !autoMode) return;
    const t = setInterval(() => setMode((m) => (m + 1) % 3), 2200);
    return () => clearInterval(t);
  }, [cur, autoMode]);

  const go = (i) => setCur(Math.max(0, Math.min(N - 1, i)));
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);

  const onStart = (x, y) => (drag.current = { x, y, on: true, moved: false });
  const onMove = (x, y) => {
    const d = drag.current;
    if (d.on && (Math.abs(x - d.x) > 6 || Math.abs(y - d.y) > 6)) d.moved = true;
  };
  const onEnd = (x, y) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const dx = x - d.x,
      dy = y - d.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cls = (i) =>
    "slide" + (i === cur ? " active" : i < cur ? " prevd" : "");
  const skip = () => {
    try {
      localStorage.setItem("zp_skip_landing", "1");
    } catch {}
    onTry();
  };
  const create = () => {
    track("landing_cta", { which: "signup" });
    router.push("/auth");
  };
  const tryGuest = () => {
    track("landing_cta", { which: "guest" });
    skip();
  };
  const toggleFog = (k) => {
    tapFeedback();
    setFog((f) => ({ ...f, [k]: !f[k] }));
  };

  return (
    <div
      className="stories"
      ref={rootRef}
      onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) =>
        onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
      }
      onMouseDown={(e) => onStart(e.clientX, e.clientY)}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseUp={(e) => onEnd(e.clientX, e.clientY)}
      onClick={(e) => {
        if (drag.current.moved) {
          drag.current.moved = false;
          return;
        }
        if (
          e.target.closest(
            ".stbtn, .tab, .fog, .gap, a, button, .bar, .skip"
          )
        )
          return;
        if (e.clientX < window.innerWidth * 0.38) prev();
        else next();
      }}
    >
      <div className="bars">
        {Array.from({ length: N }).map((_, i) => (
          <div
            key={i}
            className={"bar" + (i < cur ? " done" : i === cur ? " active" : "")}
            onClick={(e) => {
              e.stopPropagation();
              go(i);
            }}
          >
            <i />
          </div>
        ))}
      </div>

      <p className="st-logo">
        Запе<em>вай</em>
      </p>
      <button className="skip" onClick={skip}>
        Пропустить
      </button>

      <div className="slides">
        {/* 1 HERO */}
        <section className={cls(0)} data-i="0">
          <div className="kicker anim d2">Тренажёр памяти для песен</div>
          <h1 className="lead anim d2">
            Выучи{" "}
            <span
              className={"fog" + (fog[0] ? " clear" : "")}
              onClick={(e) => {
                e.stopPropagation();
                toggleFog(0);
              }}
            >
              любую
            </span>{" "}
            песню{" "}
            <span
              className={"fog" + (fog[1] ? " clear" : "")}
              onClick={(e) => {
                e.stopPropagation();
                toggleFog(1);
              }}
            >
              наизусть
            </span>
          </h1>
          <p className="sub anim d3">
            Бесплатно, без регистрации. Прячем слова — а ты достаёшь их из
            памяти. Смотри, как открывается туман.
          </p>
          <svg className="hero-wave anim d4" viewBox="0 0 240 42">
            <path d="M2,21 Q22,2 42,21 T82,21 T122,21 T162,21 T202,21 T238,21" />
          </svg>
          <div className="hint">
            <span>листай →</span>
          </div>
        </section>

        {/* 2 PROBLEM → SOLUTION */}
        <section className={cls(1)} data-i="1">
          <div className="kicker anim d1">Как это работает</div>
          <h2 className="lead anim d1" style={{ fontSize: 34 }}>
            Зубрить скучно.
            <br />
            Вспоминать — нет.
          </h2>
          <p className="sub anim d2">
            Мозг закрепляет слово не когда читает его, а когда{" "}
            <b style={{ color: "var(--wine)" }}>достаёт сам</b>. Поэтому мы
            убираем подсказки и даём тебе вспомнить.
          </p>
          <p className="songline anim d3" style={{ marginTop: 26 }}>
            <b>Выйду</b> ночью в{" "}
            <span className={"gap" + (gaps[0] ? " shown" : "")}>поле</span> с{" "}
            <span className={"gap" + (gaps[1] ? " shown" : "")}>конём</span>,
            <br />
            ночкой тёмной{" "}
            <span className={"gap" + (gaps[2] ? " shown" : "")}>тихо</span>{" "}
            <span className={"gap" + (gaps[3] ? " shown" : "")}>пойдём</span>…
          </p>
          <div className="hint">
            <span>смотри, как открываются пропуски</span>
          </div>
        </section>

        {/* 3 SCIENCE */}
        <section className={cls(2)} data-i="2">
          <div className="kicker anim d1">Умная технология</div>
          <h2 className="lead anim d1" style={{ fontSize: 32 }}>
            Прячем нужные слова,
            <br />а не лишние
          </h2>
          <p className="sub anim d2">
            Подстраиваемся под тебя: что даётся легко — показываем реже, что
            забываешь — прячем чаще. Это извлечение из памяти, самый быстрый
            способ запомнить.
          </p>
          <div className="bigstat anim d3">
            <span className="n">85</span>
            <span className="p">%</span>
          </div>
          <div className="gauge anim d3">
            <i />
            <span className="mark" />
          </div>
          <div className="gauge-cap anim d3">
            <span>слишком легко</span>
            <span>в самый раз</span>
            <span>сложно</span>
          </div>
          <p className="sub anim d4" style={{ marginTop: 14 }}>
            Держим сложность около{" "}
            <b style={{ color: "var(--wine)" }}>85% угадываний</b> — там память
            работает на максимум.
          </p>
        </section>

        {/* 4 MODES */}
        <section className={cls(3)} data-i="3">
          <div className="kicker anim d1">3 режима тренировки</div>
          <h2 className="lead anim d1" style={{ fontSize: 30 }}>
            Выбирай, как учить
          </h2>
          <div className="tabs anim d2">
            {["Пропуски", "Первые буквы", "Эстафета"].map((t, m) => (
              <div
                key={m}
                className={"tab" + (mode === m ? " on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoMode(false);
                  setMode(m);
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div className="demo anim d3">
            <div className={"demo-pane" + (mode === 0 ? " on" : "")}>
              Мороз и солнце; <span className="miss">день</span> чудесный!
              <br />
              Ещё ты <span className="miss">дремлешь</span>, друг{" "}
              <span className="miss">прелестный</span>…
              <span className="lvl">Уровень 3 из 5 · скрыто 40%</span>
            </div>
            <div className={"demo-pane" + (mode === 1 ? " on" : "")}>
              <span className="firstl">М</span>
              <small>____</small> и <span className="firstl">с</span>
              <small>_____</small>; <span className="firstl">д</span>
              <small>___</small> чудесный!
              <br />
              <span className="firstl">Е</span>
              <small>__</small> ты <span className="firstl">д</span>
              <small>_______</small>…
              <span className="lvl">Только первые буквы — вспомни остальное</span>
            </div>
            <div className={"demo-pane" + (mode === 2 ? " on" : "")}>
              <span className="relay-line live">
                Мороз и солнце; день чудесный!
              </span>
              <br />
              <span className="relay-line">Ещё ты дремлешь, друг прелестный…</span>
              <br />
              <span className="relay-line">Пора, красавица, проснись…</span>
              <span className="lvl">Строки по очереди — держи нить</span>
            </div>
          </div>
          <div className="hint">
            <span>переключай режимы вверху</span>
          </div>
        </section>

        {/* 5 SPACED REPETITION */}
        <section className={cls(4)} data-i="4">
          <div className="kicker anim d1">Повторения вовремя</div>
          <h2 className="lead anim d1" style={{ fontSize: 30 }}>
            Напомним через
            <br />1·3·7·14·30 дней
          </h2>
          <div className="timeline anim d2">
            <div className="tl-track" />
            <div className="tl-fill" />
            {[
              [0, "1", ".4s"],
              [25, "3", ".7s"],
              [50, "7", "1s"],
              [75, "14", "1.3s"],
              [100, "30", "1.6s"],
            ].map(([l, d, del]) => (
              <div key={d} className="tl-pt" style={{ left: `${l}%` }}>
                <div className="dot" style={{ animationDelay: del }} />
                <div className="d">{d}</div>
              </div>
            ))}
          </div>
          <div className="st-ring anim d3">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle className="bg" cx="54" cy="54" r="46" />
              <circle className="fg" cx="54" cy="54" r="46" />
            </svg>
            <div className="label">
              <b>75%</b>
              <span>в памяти</span>
            </div>
          </div>
          <p
            className="sub anim d4"
            style={{ margin: "14px auto 0", textAlign: "center" }}
          >
            <span className="flame">🔥</span> Заглядывай каждый день — серия
            растёт, песня остаётся.
          </p>
        </section>

        {/* 6 BENEFITS */}
        <section className={cls(5)} data-i="5">
          <div className="kicker anim d1">Почему «Запевай»</div>
          <h2 className="lead anim d1" style={{ fontSize: 32 }}>
            Всё ради
            <br />
            лёгкой памяти
          </h2>
          <div className="pills">
            {[
              ["✓", "Без зубрёжки", "d2"],
              ["↻", "Без регистрации", "d2"],
              ["▢", "На любом устройстве", "d3"],
              ["♪", "Общая база песен", "d3"],
              ["⤓", "Ставится на телефон", "d4"],
              ["◐", "3 темы оформления", "d4"],
            ].map(([ic, t, d]) => (
              <div key={t} className={"pill anim " + d}>
                <span className="ic">{ic}</span>
                {t}
              </div>
            ))}
          </div>
          <p className="sub anim d5" style={{ marginTop: 20 }}>
            Открыл в браузере — и поёшь. Ничего скачивать не нужно, но при
            желании добавь на главный экран.
          </p>
        </section>

        {/* 7 REVIEWS */}
        <section className={cls(6)} data-i="6">
          <div className="kicker anim d1">Отзывы</div>
          <span className="demo-tag anim d1">Примеры · заглушки</span>
          <div className="review anim d2">
            <div className="stars">★★★★★</div>
            <p className="q">
              «За три вечера выучила всю “Катюшу” для концерта. Туман-слова — это
              магия: сам не замечаешь, как помнишь.»
            </p>
            <div className="who">
              <span className="ava">М</span>Марина, поёт в хоре
            </div>
          </div>
          <div className="review anim d3">
            <div className="stars">★★★★★</div>
            <p className="q">
              «Учу тексты на гитару. Режим “первые буквы” — то, чего не хватало.
              И напоминания приходят вовремя.»
            </p>
            <div className="who">
              <span className="ava">Д</span>Денис, любитель бардовской
            </div>
          </div>
          <p className="sub anim d4" style={{ fontSize: 12 }}>
            Это демонстрационные отзывы — настоящие появятся, когда ты споёшь
            первым.
          </p>
        </section>

        {/* 8 CTA */}
        <section className={cls(7)} data-i="7">
          <div className="final-mark anim d1">♪</div>
          <h2 className="lead anim d1" style={{ fontSize: 36 }}>
            Спой по памяти —
            <br />
            от первой
            <br />
            до последней
          </h2>
          <p className="sub anim d2">
            Заведи свой песенник за минуту. Без карт, без воды.
          </p>
          <div className="cta-wrap">
            <button
              className="stbtn btn-wine anim d3"
              onClick={(e) => {
                e.stopPropagation();
                create();
              }}
            >
              Создать песенник
            </button>
            <button
              className="stbtn btn-glass anim d4"
              onClick={(e) => {
                e.stopPropagation();
                tryGuest();
              }}
            >
              Попробовать без регистрации
            </button>
          </div>
          <p className="terms anim d5">
            Нажимая, ты соглашаешься с{" "}
            <a href="/terms">условиями использования</a>. Сервис бесплатный.
          </p>
        </section>
      </div>
    </div>
  );
}
