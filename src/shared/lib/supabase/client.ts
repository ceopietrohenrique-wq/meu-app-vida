"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase para uso em Client Components.
 * Usa apenas a chave anon — todo acesso a dados passa pelas policies de RLS.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
