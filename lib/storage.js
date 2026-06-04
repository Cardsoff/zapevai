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
    if (error) throw new Error(error.message);
    return (data || []).map((r) => r.songs).filter(Boolean);
  }
  return lsGet(K_SONGS, []);
}

export async function getSong(id) {
  const user = await cloudUser();
  const sb = getSupabase();
  if (user) {
    const { data } = await sb.from("songs").select("*").eq("id", id).single();
    return data || null;
  }
  const local = lsGet(K_SONGS, []).find((s) => s.id === id);
  if (local) return local;
  // гость открывает песню из общей базы
  if (sb) {
    const { data } = await sb.from("songs").select("*").eq("id", id).maybeSingle();
    return data || null;
  }
  return null;
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
      .is("parent_id", null)
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

  // тарифный лимит
  const plan = await getPlan();
  if (plan === "free") {
    const mine = await listMySongs();
    if (mine.length >= FREE_SONG_LIMIT) return { limit: true };
  }

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
        .is("parent_id", null)
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
  if (!user) return {};
  const plan = await getPlan();
  if (plan === "free") {
    const mine = await listMySongs();
    if (mine.length >= FREE_SONG_LIMIT && !mine.some((s) => s.id === songId))
      return { limit: true };
  }
  const sb = getSupabase();
  await sb.from("user_songs").upsert({ user_id: user.id, song_id: songId });
  return {};
}

export async function removeSong(id) {
  const plan = await getPlan();
  if (plan === "free") return { limit: true };
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


// Случайные песни общей базы (для подсказок; доступно и гостям)
export async function listBaseSongs(limit = 8) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("songs")
    .select("id, title, artist")
    .is("parent_id", null)
    .limit(50);
  const arr = data || [];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, limit);
}

// ---------- МИГРАЦИЯ ГОСТЬ → ОБЛАКО ----------
// После входа переносит песни и прогресс из localStorage в Supabase.
// Идемпотентна: помечает выполнение флагом и чистит localStorage.
export async function migrateGuestData() {
  const user = await cloudUser();
  if (!user) return { migrated: 0 };
  const songs = lsGet(K_SONGS, []);
  const prog = lsGet(K_PROG, {});
  const days = lsGet(K_DAYS, []);
  if (songs.length === 0 && days.length === 0) {
    lsSet(K_SONGS, []);
    lsSet(K_PROG, {});
    lsSet(K_DAYS, []);
    return { migrated: 0 };
  }
  const sb = getSupabase();
  let migrated = 0;
  const idMap = {}; // localId -> cloudSongId

  for (const song of songs) {
    try {
      const res = await addSong({
        title: song.title,
        artist: song.artist || "",
        lyrics: song.lyrics,
        force: true, // не блокируем лимитом при переносе
      });
      if (res?.id) {
        idMap[song.id] = res.id;
        migrated++;
      } else if (res?.duplicate || res?.nameMatch) {
        const cid = res.id || res.nameMatch?.id;
        if (cid) {
          await addToLibrary(cid);
          idMap[song.id] = cid;
          migrated++;
        }
      }
    } catch {}
  }

  // прогресс по каждой песне
  for (const [localId, p] of Object.entries(prog)) {
    const cid = idMap[localId];
    if (!cid || !p) continue;
    try {
      for (let lvl = 1; lvl <= 5; lvl++) {
        if (p.cloze?.[lvl]) await saveResult(cid, "cloze", lvl, p.cloze[lvl]);
      }
      if (p.letters) await saveResult(cid, "letters", 0, p.letters);
      if (p.relay) await saveResult(cid, "relay", 0, p.relay);
      if (p.learned) await setLearned(cid, true);
    } catch {}
  }

  // дни активности
  for (const day of days) {
    try {
      await sb.from("activity").upsert({ user_id: user.id, day });
    } catch {}
  }

  // очистка локального гостевого хранилища
  lsSet(K_SONGS, []);
  lsSet(K_PROG, {});
  lsSet(K_DAYS, []);
  return { migrated };
}

// ---------- РЕФЕРАЛЫ ----------
export async function getMyReferralCode() {
  const user = await cloudUser();
  if (!user) return null;
  const sb = getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("referral_code")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.referral_code || null;
}

// Если пришли по реф-ссылке (?ref=...) — привязываем после входа
export async function applyPendingReferral() {
  try {
    const code = localStorage.getItem("zp_ref");
    if (!code) return;
    const user = await cloudUser();
    if (!user) return;
    const sb = getSupabase();
    await sb.rpc("apply_referral", { code });
    localStorage.removeItem("zp_ref");
  } catch {}
}

// ---------- АНКЕТА ----------
export async function getMyProfile() {
  const user = await cloudUser();
  if (!user) return null;
  const sb = getSupabase();
  const { data } = await sb.rpc("my_profile");
  return (data && data[0]) || null;
}

export async function updateMyProfile({ name, city, about }) {
  const sb = getSupabase();
  const { error } = await sb.rpc("update_my_profile", {
    p_name: name || "",
    p_city: city || "",
    p_about: about || "",
  });
  return { error: error?.message };
}

// ---------- ЗАМЕЧАНИЯ К ПЕСНЯМ ----------
export async function reportSong(songId, comment, file = null) {
  const user = await cloudUser();
  if (!user) return { error: "Нужно войти, чтобы отправить замечание" };
  const sb = getSupabase();
  const screenshot_url = file ? await uploadScreenshot(file) : null;
  const { error } = await sb.from("song_reports").insert({
    song_id: songId,
    user_id: user.id,
    comment: comment.trim(),
    screenshot_url,
  });
  return { error: error?.message };
}

// Загрузка скриншота в хранилище, возвращает публичный URL
export async function uploadScreenshot(file) {
  const user = await cloudUser();
  if (!user || !file) return null;
  if (file.size > 5 * 1024 * 1024) return null; // до 5 МБ
  const sb = getSupabase();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("feedback").upload(path, file);
  if (error) return null;
  const { data } = sb.storage.from("feedback").getPublicUrl(path);
  return data?.publicUrl || null;
}

// Предложение по продукту (без привязки к песне)
export async function sendSuggestion(text, file = null) {
  const user = await cloudUser();
  if (!user) return { error: "Нужно войти" };
  const sb = getSupabase();
  const screenshot_url = file ? await uploadScreenshot(file) : null;
  const { error } = await sb.from("song_reports").insert({
    song_id: null,
    user_id: user.id,
    comment: text.trim(),
    screenshot_url,
  });
  return { error: error?.message };
}

// Правка текста песни.
// Гость и админ правят свою/общую напрямую; обычный пользователь получает
// личную копию, а правка уходит админу на рассмотрение («Принять в общую»).
export async function updateSongLyrics(songId, lyrics) {
  const user = await cloudUser();
  const hash = hashLyrics(lyrics);

  // гостевой режим — правим локально
  if (!user) {
    const songs = lsGet(K_SONGS, []);
    const i = songs.findIndex((x) => x.id === songId);
    if (i >= 0) {
      songs[i] = { ...songs[i], lyrics: lyrics.trim(), hash };
      lsSet(K_SONGS, songs);
    }
    return {};
  }

  const sb = getSupabase();
  const { data: song } = await sb
    .from("songs")
    .select("id, title, artist, created_by, parent_id")
    .eq("id", songId)
    .single();
  if (!song) return { error: "Песня не найдена" };

  const admin = ADMIN_EMAILS.includes(user.email);
  const ownPrivate = song.parent_id && song.created_by === user.id;

  // админ — правит что угодно напрямую; свою личную копию тоже правим напрямую
  if (admin || ownPrivate) {
    const { error } = await sb
      .from("songs")
      .update({ lyrics: lyrics.trim(), hash })
      .eq("id", songId);
    return { error: error?.message };
  }

  // обычный пользователь: создаём личную копию
  const { data: copy, error: insErr } = await sb
    .from("songs")
    .insert({
      title: song.title,
      artist: song.artist,
      lyrics: lyrics.trim(),
      hash: hash + "-v" + Date.now().toString(36),
      created_by: user.id,
      parent_id: song.id,
    })
    .select("id")
    .single();
  if (insErr) return { error: insErr.message };

  // переключаем библиотеку и переносим прогресс на копию
  const { data: lib } = await sb
    .from("user_songs")
    .select("learned")
    .eq("user_id", user.id)
    .eq("song_id", song.id)
    .maybeSingle();
  await sb.from("user_songs").upsert({
    user_id: user.id,
    song_id: copy.id,
    learned: Boolean(lib?.learned),
  });
  await sb
    .from("user_songs")
    .delete()
    .eq("user_id", user.id)
    .eq("song_id", song.id);
  for (const table of ["progress", "srs"]) {
    await sb
      .from(table)
      .update({ song_id: copy.id })
      .eq("user_id", user.id)
      .eq("song_id", song.id);
  }

  // заявка админу
  await sb.from("song_edits").insert({
    original_id: song.id,
    copy_id: copy.id,
    user_id: user.id,
  });

  return { newId: copy.id };
}

// ---------- ТАРИФЫ ----------
export const FREE_SONG_LIMIT = 1;

export async function getPlan() {
  const user = await cloudUser();
  if (!user) return "free"; // гость
  if (ADMIN_EMAILS.includes(user.email)) return "pro";
  const sb = getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.plan === "pro" ? "pro" : "free";
}

export async function adminListUsers() {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_users");
  return data || [];
}

export async function adminSongs() {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_songs");
  return data || [];
}

export async function adminDeleteSong(songId) {
  const sb = getSupabase();
  const { error } = await sb.rpc("admin_delete_song", { target: songId });
  return { error: error?.message };
}

export async function adminEdits() {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_edits");
  return data || [];
}

export async function adminApplyEdit(editId, newLyrics) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("admin_apply_edit", {
    edit_id: editId,
    new_hash: hashLyrics(newLyrics),
  });
  return { result: data, error: error?.message };
}

export async function adminRejectEdit(editId) {
  const sb = getSupabase();
  await sb.from("song_edits").delete().eq("id", editId);
}

export async function adminReports() {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_reports");
  return data || [];
}

export async function adminDeleteReport(id) {
  const sb = getSupabase();
  await sb.from("song_reports").delete().eq("id", id);
}

export async function adminStats(days = null) {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_stats", { days });
  return data || null;
}

export async function adminUserSongs(userId) {
  const sb = getSupabase();
  const { data } = await sb.rpc("admin_user_songs", { target: userId });
  return data || [];
}

export async function adminSetPlan(userId, plan) {
  const sb = getSupabase();
  const { error } = await sb
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { error: error?.message };
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
