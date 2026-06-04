"use client";

// ─── Единый слой данных ───
// Если пользователь вошёл через Supabase — данные в облаке.
// Иначе — гостевой режим, всё хранится в браузере (localStorage).

import { hashLyrics, normalizeMeta } from "./lyrics";
import { nextSrs, todayStr, calcStreak, calcBestStreak, isDue } from "./srs";
import { getSupabase, getUser } from "./supabase";

// ---------- localStorage helpers ----------
function lsGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const K_SONGS = "zp_songs";
const K_PROG = "zp_progress";
const K_DAYS = "zp_days";

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

async function cloudUser() {
  try {
    return await getUser();
  } catch {
    return null;
  }
}

// ---------- ПЕСНИ ----------
export async function listMySongs() {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("user_songs")
      .select("song_id, songs(id, title, artist, lyrics, hash)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });
    if (error) return [];
    return (data || []).map((r) => r.songs).filter(Boolean);
  }
  return lsGet(K_SONGS, []);
}

export async function getSong(id) {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const { data } = await sb.from("songs").select("*").eq("id", id).single();
    return data || null;
  }
  return lsGet(K_SONGS, []).find((s) => s.id === id) || null;
}

// Поиск по общей базе (в облаке — по всем пользователям)
export async function searchSongs(query) {
  const q = normalizeMeta(query);
  if (!q) return [];
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const { data } = await sb
      .from("songs")
      .select("id, title, artist")
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      .limit(20);
    return data || [];
  }
  return lsGet(K_SONGS, []).filter(
    (s) =>
      normalizeMeta(s.title).includes(q) || normalizeMeta(s.artist).includes(q)
  );
}

// Совпадение по названию+исполнителю (одно из полей artist может быть пустым)
function sameMeta(a, b) {
  if (normalizeMeta(a.title) !== normalizeMeta(b.title)) return false;
  const ar1 = normalizeMeta(a.artist);
  const ar2 = normalizeMeta(b.artist);
  return !ar1 || !ar2 || ar1 === ar2;
}

// Добавление песни с проверкой на дубль: по хэшу текста и по названию.
// force=true — сохранить свою версию, игнорируя совпадение названия.
export async function addSong({ title, artist, lyrics, force = false }) {
  const hash = hashLyrics(lyrics);
  const user = await cloudUser();

  if (user) {
    const sb = getSupabase();
    // дубль по тексту среди всех пользователей?
    const { data: existing } = await sb
      .from("songs")
      .select("id, title, artist")
      .eq("hash", hash)
      .maybeSingle();

    // дубль по названию (текст другой)?
    if (!existing && !force) {
      const { data: byName } = await sb
        .from("songs")
        .select("id, title, artist")
        .ilike("title", normalizeMeta(title))
        .limit(5);
      const match = (byName || []).find((s) =>
        sameMeta(s, { title, artist })
      );
      if (match) return { nameMatch: match };
    }

    let songId;
    let duplicate = false;
    if (existing) {
      songId = existing.id;
      duplicate = true;
    } else {
      const { data: inserted, error } = await sb
        .from("songs")
        .insert({
          title: title.trim(),
          artist: artist.trim(),
          lyrics: lyrics.trim(),
          hash,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) {
        // гонка: кто-то добавил ту же песню параллельно
        const { data: again } = await sb
          .from("songs")
          .select("id")
          .eq("hash", hash)
          .maybeSingle();
        if (!again) return { error: error.message };
        songId = again.id;
        duplicate = true;
      } else {
        songId = inserted.id;
      }
    }
    await sb
      .from("user_songs")
      .upsert({ user_id: user.id, song_id: songId })
      .select();
    return { id: songId, duplicate };
  }

  // гостевой режим
  const songs = lsGet(K_SONGS, []);
  const dup = songs.find((s) => s.hash === hash);
  if (dup) return { id: dup.id, duplicate: true };
  if (!force) {
    const match = songs.find((s) => sameMeta(s, { title, artist }));
    if (match)
      return {
        nameMatch: { id: match.id, title: match.title, artist: match.artist },
      };
  }
  const song = {
    id: uid(),
    title: title.trim(),
    artist: artist.trim(),
    lyrics: lyrics.trim(),
    hash,
    createdAt: Date.now(),
  };
  lsSet(K_SONGS, [song, ...songs]);
  return { id: song.id, duplicate: false };
}

// Добавить чужую песню из общей базы в свою библиотеку
export async function addToLibrary(songId) {
  const user = await cloudUser();
  if (!user) return;
  const sb = getSupabase();
  await sb.from("user_songs").upsert({ user_id: user.id, song_id: songId });
}

export async function removeSong(id) {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    await sb
      .from("user_songs")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", id);
    return;
  }
  lsSet(
    K_SONGS,
    lsGet(K_SONGS, []).filter((s) => s.id !== id)
  );
  const prog = lsGet(K_PROG, {});
  delete prog[id];
  lsSet(K_PROG, prog);
}

// Пометить песню как выученную (и обратно)
export async function setLearned(songId, learned) {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    await sb
      .from("user_songs")
      .update({ learned })
      .eq("user_id", user.id)
      .eq("song_id", songId);
    return;
  }
  const all = lsGet(K_PROG, {});
  const p = all[songId] || { cloze: {}, letters: null, relay: null, srs: null };
  p.learned = learned;
  all[songId] = p;
  lsSet(K_PROG, all);
}

// ---------- ПРОГРЕСС ----------
// Структура: { cloze: {1: 95, 2: 80, ...}, letters: 90, relay: 70,
//              srs: {stage, nextReview}, lastTrained }

export async function getProgress(songId) {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const [{ data: rows }, { data: srsRow }, { data: libRow }] = await Promise.all([
      sb
        .from("progress")
        .select("mode, level, best_score")
        .eq("user_id", user.id)
        .eq("song_id", songId),
      sb
        .from("srs")
        .select("stage, next_review")
        .eq("user_id", user.id)
        .eq("song_id", songId)
        .maybeSingle(),
      sb
        .from("user_songs")
        .select("learned")
        .eq("user_id", user.id)
        .eq("song_id", songId)
        .maybeSingle(),
    ]);
    const p = {
      cloze: {},
      letters: null,
      relay: null,
      srs: null,
      learned: Boolean(libRow?.learned),
    };
    (rows || []).forEach((r) => {
      if (r.mode === "cloze") p.cloze[r.level] = r.best_score;
      else p[r.mode] = r.best_score;
    });
    if (srsRow) p.srs = { stage: srsRow.stage, nextReview: srsRow.next_review };
    return p;
  }
  const all = lsGet(K_PROG, {});
  const p = all[songId] || { cloze: {}, letters: null, relay: null, srs: null };
  if (p.learned === undefined) p.learned = false;
  return p;
}

export async function saveResult(songId, mode, level, score) {
  const user = await cloudUser();
  const today = todayStr();

  if (user) {
    const sb = getSupabase();
    const lvl = mode === "cloze" ? level : 0;
    const { data: prev } = await sb
      .from("progress")
      .select("best_score")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .eq("mode", mode)
      .eq("level", lvl)
      .maybeSingle();
    const best = Math.max(prev?.best_score || 0, score);
    await sb.from("progress").upsert({
      user_id: user.id,
      song_id: songId,
      mode,
      level: lvl,
      best_score: best,
      updated_at: new Date().toISOString(),
    });
    const { data: prevSrs } = await sb
      .from("srs")
      .select("stage, next_review")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .maybeSingle();
    const ns = nextSrs(
      prevSrs ? { stage: prevSrs.stage } : null,
      score
    );
    await sb.from("srs").upsert({
      user_id: user.id,
      song_id: songId,
      stage: ns.stage,
      next_review: ns.nextReview,
    });
    await sb.from("activity").upsert({ user_id: user.id, day: today });
    return;
  }

  const all = lsGet(K_PROG, {});
  const p = all[songId] || { cloze: {}, letters: null, relay: null, srs: null };
  if (mode === "cloze") {
    p.cloze[level] = Math.max(p.cloze[level] || 0, score);
  } else {
    p[mode] = Math.max(p[mode] || 0, score);
  }
  p.srs = nextSrs(p.srs, score);
  p.lastTrained = today;
  all[songId] = p;
  lsSet(K_PROG, all);

  const days = lsGet(K_DAYS, []);
  if (!days.includes(today)) {
    days.push(today);
    lsSet(K_DAYS, days);
  }
}

// ---------- ПОВТОРЕНИЯ И СТАТИСТИКА ----------
export async function getDueSongs() {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const { data } = await sb
      .from("srs")
      .select("song_id, next_review, songs(id, title, artist)")
      .eq("user_id", user.id)
      .lte("next_review", todayStr());
    return (data || []).map((r) => r.songs).filter(Boolean);
  }
  const songs = lsGet(K_SONGS, []);
  const prog = lsGet(K_PROG, {});
  return songs.filter((s) => isDue(prog[s.id]?.srs));
}

// Список выученных песен
export async function listLearnedSongs() {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const { data } = await sb
      .from("user_songs")
      .select("songs(id, title, artist)")
      .eq("user_id", user.id)
      .eq("learned", true);
    return (data || []).map((r) => r.songs).filter(Boolean);
  }
  const songs = lsGet(K_SONGS, []);
  const prog = lsGet(K_PROG, {});
  return songs.filter((s) => prog[s.id]?.learned);
}

export async function getStats() {
  const user = await cloudUser();
  if (user) {
    const sb = getSupabase();
    const [{ data: days }, { data: lib }] = await Promise.all([
      sb.from("activity").select("day").eq("user_id", user.id),
      sb.from("user_songs").select("song_id, learned").eq("user_id", user.id),
    ]);
    const dayList = (days || []).map((d) => d.day);
    return {
      streak: calcStreak(dayList),
      best: calcBestStreak(dayList),
      totalSongs: (lib || []).length,
      mastered: (lib || []).filter((r) => r.learned).length,
    };
  }
  const songs = lsGet(K_SONGS, []);
  const prog = lsGet(K_PROG, {});
  const mastered = songs.filter((s) => prog[s.id]?.learned);
  return {
    streak: calcStreak(lsGet(K_DAYS, [])),
    best: calcBestStreak(lsGet(K_DAYS, [])),
    totalSongs: songs.length,
    mastered: mastered.length,
  };
}

// Сводный прогресс песни в процентах (для кольца)
export function songMastery(progress) {
  if (!progress) return 0;
  const parts = [];
  for (let l = 1; l <= 5; l++) parts.push((progress.cloze?.[l] || 0) / 100);
  parts.push((progress.letters || 0) / 100);
  parts.push((progress.relay || 0) / 100);
  const sum = parts.reduce((a, b) => a + b, 0);
  return Math.round((sum / parts.length) * 100);
}

// ---------- АДМИН ----------
export const ADMIN_EMAILS = [
  "human.artem26@gmail.com",
  "human.artem@icloud.com",
];

export async function isAdmin() {
  const user = await cloudUser();
  return Boolean(user && ADMIN_EMAILS.includes(user.email));
}

// Массовая загрузка песен в ОБЩУЮ базу (без добавления в свою библиотеку).
// items: [{title, artist, lyrics}] -> [{title, status: added|duplicate|error, detail?}]
export async function adminBulkAddSongs(items) {
  const user = await cloudUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return items.map((it) => ({ title: it.title, status: "error", detail: "нет доступа" }));
  }
  const sb = getSupabase();
  const results = [];
  for (const it of items) {
    const hash = hashLyrics(it.lyrics);
    try {
      const { data: existing } = await sb
        .from("songs")
        .select("id, title")
        .eq("hash", hash)
        .maybeSingle();
      if (existing) {
        results.push({ title: it.title, status: "duplicate", detail: existing.title });
        continue;
      }
      const { error } = await sb.from("songs").insert({
        title: it.title.trim(),
        artist: (it.artist || "").trim(),
        lyrics: it.lyrics.trim(),
        hash,
        created_by: user.id,
      });
      if (error) results.push({ title: it.title, status: "error", detail: error.message });
      else results.push({ title: it.title, status: "added" });
    } catch (e) {
      results.push({ title: it.title, status: "error", detail: String(e) });
    }
  }
  return results;
}
