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

// Выбор слов для скрытия. На высоких уровнях скрываются в первую
// очередь значимые (длинные) слова.
export function pickHiddenWords(parsed, level) {
  const words = [];
  parsed.sections.forEach((sec) =>
    sec.lines.forEach((line) =>
      line.tokens.forEach((t) => {
        if (t.type === "word") words.push(t);
      })
    )
  );
  const share = CLOZE_LEVELS.find((l) => l.level === level)?.share ?? 0.25;
  const count = Math.max(1, Math.round(words.length * share));
  if (count >= words.length) return new Set(words.map((w) => w.i));

  // вес: длинные слова прячем охотнее на уровнях 3+
  const weighted = words.map((w) => ({
    i: w.i,
    weight:
      level >= 3
        ? w.text.length > 3
          ? 3 + Math.random()
          : 1 + Math.random()
        : Math.random() + (w.text.length > 2 ? 0.3 : 0),
  }));
  weighted.sort((a, b) => b.weight - a.weight);
  return new Set(weighted.slice(0, count).map((w) => w.i));
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
