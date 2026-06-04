// ─── Интервальные повторения (упрощённый SM-2) ───
// Этапы: через 1 → 3 → 7 → 14 → 30 дней
export const SRS_INTERVALS = [1, 3, 7, 14, 30];

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

// Обновление этапа после тренировки
export function nextSrs(prev, score) {
  const stage = prev?.stage ?? -1;
  let newStage;
  if (score >= 90) newStage = Math.min(stage + 1, SRS_INTERVALS.length - 1);
  else if (score >= 60) newStage = Math.max(stage, 0);
  else newStage = Math.max(stage - 1, 0);
  return {
    stage: newStage,
    nextReview: addDays(todayStr(), SRS_INTERVALS[newStage]),
  };
}

export function isDue(srs) {
  if (!srs?.nextReview) return false;
  return srs.nextReview <= todayStr();
}

// Серия дней по списку дат тренировок
export function calcStreak(days) {
  if (!days || days.length === 0) return 0;
  const set = new Set(days);
  let streak = 0;
  let cursor = todayStr();
  if (!set.has(cursor)) {
    cursor = addDays(cursor, -1); // серия жива, если тренировался вчера
    if (!set.has(cursor)) return 0;
  }
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Лучшая серия за всё время по списку дат
export function calcBestStreak(days) {
  if (!days || days.length === 0) return 0;
  const sorted = [...new Set(days)].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (addDays(sorted[i - 1], 1) === sorted[i]) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}
