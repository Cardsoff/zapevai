// ─── Движок текстов: парсинг, пропуски, дедупликация ───

// Разбор текста: куплеты → строки → токены (слова и разделители)
export function parseLyrics(raw) {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  const sections = text
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let wordIndex = 0;
  const parsed = sections.map((section) => {
    const lines = section
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const tokens = [];
        // слово = последовательность букв/цифр/дефисов/апострофов
        const re = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
        let last = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          if (m.index > last) {
            tokens.push({ type: "sep", text: line.slice(last, m.index) });
          }
          tokens.push({ type: "word", text: m[0], i: wordIndex++ });
          last = m.index + m[0].length;
        }
        if (last < line.length) {
          tokens.push({ type: "sep", text: line.slice(last) });
        }
        return { tokens, text: line };
      });
    return { lines };
  });

  return { sections: parsed, totalWords: wordIndex };
}

// Все строки подряд (для режимов Эстафета и Первые буквы)
export function flatLines(parsed) {
  const out = [];
  parsed.sections.forEach((sec, si) => {
    sec.lines.forEach((line) => out.push({ ...line, section: si }));
  });
  return out;
}

// ─── Уровни режима «Пропуски слов» ───
export const CLOZE_LEVELS = [
  { level: 1, share: 0.1, name: "Разминка", desc: "Скрыто 10% слов" },
  { level: 2, share: 0.25, name: "Лёгкий", desc: "Скрыто 25% слов" },
  { level: 3, share: 0.5, name: "Средний", desc: "Скрыта половина слов" },
  { level: 4, share: 0.75, name: "Сложный", desc: "Видны только опорные слова" },
  { level: 5, share: 1.0, name: "Наизусть", desc: "Скрыт весь текст" },
];

// ─── Умный выбор слов для скрытия (по принципам retrieval practice) ───
// 1) Прячем смысловые слова, служебные почти не трогаем (на L1–L3).
// 2) Начала строк/куплетов — якоря: видимы на L1–L2, тренируются на L4.
// 3) Каждый прогон паттерн новый (джиттер), но с логикой.
// 4) Адаптивность: чаще прячем то, что юзер открывал (= забывал).

const FUNCTION_WORDS = new Set(
  ("и в во не на я ты он она оно мы вы они же ж бы б то а но да или ли как " +
    "что чтоб чтобы у с со к ко по за из изо под над от до о об обо при без " +
    "через для меж между ну уж вот ведь лишь только бы ль эх ох ой ах эй ге гей " +
    "мой моя моё мои твой твоя твоё твои наш ваша его её их этот эта это эти " +
    "тот та те там тут здесь где когда так все всё весь вся ещё уже").split(" ")
);

function isFunctionWord(text) {
  const t = text.toLowerCase().replace(/ё/g, "е");
  return t.length <= 1 || FUNCTION_WORDS.has(t);
}

// stats: { [wordIndex]: { h: hits, m: misses, r: runs_since_hidden } }
export function pickHiddenWords(parsed, level, stats = {}) {
  const words = [];
  parsed.sections.forEach((sec, si) =>
    sec.lines.forEach((line, li) => {
      const lineWords = line.tokens.filter((t) => t.type === "word");
      lineWords.forEach((t, wi) => {
        words.push({
          i: t.i,
          text: t.text,
          line: si + ":" + li,
          isLineStart: wi === 0,
          isVerseStart: wi === 0 && li === 0,
          isRhyme: wi === lineWords.length - 1 && lineWords.length > 1,
          isFunction: isFunctionWord(t.text),
        });
      });
    })
  );
  const share = CLOZE_LEVELS.find((l) => l.level === level)?.share ?? 0.25;
  if (share >= 1) return new Set(words.map((w) => w.i));
  if (words.length === 0) return new Set();
  const target = Math.max(1, Math.round(words.length * share));

  // вес слова в этом прогоне
  const weigh = (w) => {
    let sc = 1;
    if (w.isFunction) sc *= level >= 4 ? 0.6 : 0.15;
    if (w.text.length >= 6) sc *= 1.3;
    if (level <= 2) {
      if (w.isLineStart || w.isVerseStart) return 0; // якоря видимы
      if (w.isRhyme) sc *= 1.4; // рифмы — лёгкие первые цели
    } else if (level === 3) {
      if (w.isLineStart) sc *= 0.6;
    } else {
      if (w.isLineStart) sc *= 1.5; // теперь тренируем якоря
      if (w.isVerseStart) sc *= 1.8;
    }
    const st = stats[w.i];
    if (st) {
      const missRate = (st.m + 1) / (st.m + st.h + 2); // сглаживание Лапласа
      let a = 0.5 + 2.5 * missRate; // 0.5..3.0
      if ((st.r ?? 0) >= 3) a *= 1.2; // давно не скрывалось — освежить
      sc *= Math.min(a, 3);
    } else {
      sc *= 1.15; // ещё ни разу не скрывалось — бонус покрытия
    }
    sc *= 0.7 + Math.random() * 0.6; // вариативность между прогонами
    return sc;
  };

  const lineTotals = {};
  words.forEach((w) => (lineTotals[w.line] = (lineTotals[w.line] || 0) + 1));
  const contentPerLine = {};
  words.forEach((w) => {
    if (!w.isFunction)
      contentPerLine[w.line] = (contentPerLine[w.line] || 0) + 1;
  });

  const scored = words
    .map((w) => ({ ...w, sc: weigh(w) }))
    .filter((w) => w.sc > 0)
    .sort((a, b) => b.sc - a.sc);

  const chosen = new Set();
  const perLine = {};
  const hiddenContent = {};
  const perLineMax = level === 1 ? 1 : level === 2 ? 2 : Infinity;
  const noAdjacent = level <= 2;

  const canTake = (w) => {
    if ((perLine[w.line] || 0) >= perLineMax) return false;
    if (noAdjacent && (chosen.has(w.i - 1) || chosen.has(w.i + 1)))
      return false;
    if (level === 3) {
      // не больше двух скрытых подряд
      if (chosen.has(w.i - 1) && chosen.has(w.i - 2)) return false;
      if (chosen.has(w.i + 1) && chosen.has(w.i + 2)) return false;
      if (chosen.has(w.i - 1) && chosen.has(w.i + 1)) return false;
      // в строке остаётся хотя бы одно видимое смысловое слово
      if (
        !w.isFunction &&
        (hiddenContent[w.line] || 0) >= (contentPerLine[w.line] || 1) - 1
      )
        return false;
    }
    if (level === 4) {
      // стараемся оставить хотя бы одно слово строки видимым
      if (
        lineTotals[w.line] > 1 &&
        (perLine[w.line] || 0) >= lineTotals[w.line] - 1
      )
        return false;
    }
    return true;
  };

  const take = (w) => {
    chosen.add(w.i);
    perLine[w.line] = (perLine[w.line] || 0) + 1;
    if (!w.isFunction)
      hiddenContent[w.line] = (hiddenContent[w.line] || 0) + 1;
  };

  for (const w of scored) {
    if (chosen.size >= target) break;
    if (canTake(w)) take(w);
  }
  // добор, если ограничения не дали набрать долю уровня
  if (chosen.size < target) {
    for (const w of scored) {
      if (chosen.size >= target) break;
      if (!chosen.has(w.i)) take(w);
    }
  }
  return chosen;
}

// «Первые буквы»: Привет → П…
export function firstLetterOf(word) {
  return word.charAt(0);
}

// ─── Дедупликация ───
export function normalizeLyrics(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function normalizeMeta(s) {
  return (s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

// Быстрый стабильный хэш (FNV-1a, два прохода) — для проверки дублей
export function hashLyrics(raw) {
  const str = normalizeLyrics(raw);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca77) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0") + "-" + str.length;
}
