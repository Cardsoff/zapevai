"use client";

// Лёгкий трекинг событий продукта (воронка). Никогда не роняет UI.
import { getSupabase, getUser } from "./supabase";

export async function track(name, props = {}) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    let user = null;
    try {
      user = await getUser();
    } catch {}
    await sb.from("events").insert({
      name,
      user_id: user?.id || null,
      props,
    });
  } catch {}
}
