"use client";

import { createBrowserClient } from "@supabase/ssr";

let client = null;

export function supabaseEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase() {
  if (!supabaseEnabled()) return null;
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}

export async function getUser() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const res = await Promise.race([
      sb.auth.getUser(),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    return res?.data?.user || null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase не настроен" };
  return sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signInWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: { message: "Supabase не настроен" } };
  return sb.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password, name = "") {
  const sb = getSupabase();
  if (!sb) return { error: { message: "Supabase не настроен" } };
  return sb.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() } },
  });
}

export async function changeEmail(newEmail) {
  const sb = getSupabase();
  if (!sb) return { error: { message: "Supabase не настроен" } };
  return sb.auth.updateUser({ email: newEmail.trim() });
}

export async function signOut() {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

export async function resetPassword(email) {
  const sb = getSupabase();
  if (!sb) return { error: { message: "Supabase не настроен" } };
  return sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/auth/reset",
  });
}

export async function updatePassword(password) {
  const sb = getSupabase();
  if (!sb) return { error: { message: "Supabase не настроен" } };
  return sb.auth.updateUser({ password });
}
