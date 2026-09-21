import { createClient } from "@/shared/lib/supabase/client";

import { toFriendlyAuthErrorMessage } from "./auth-errors";

export type AuthResult = { success: true } | { success: false; error: string };

function getSiteUrl(): string {
  return window.location.origin;
}

export async function signUp(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { name: params.name },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: toFriendlyAuthErrorMessage(error.message) };
  }
  return { success: true };
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    return { success: false, error: toFriendlyAuthErrorMessage(error.message) };
  }
  return { success: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: toFriendlyAuthErrorMessage(error.message) };
  }
  return { success: true };
}

export async function requestPasswordReset(params: {
  email: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/atualizar-senha`,
  });

  if (error) {
    return { success: false, error: toFriendlyAuthErrorMessage(error.message) };
  }
  return { success: true };
}

export async function updatePassword(params: {
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: params.password,
  });

  if (error) {
    return { success: false, error: toFriendlyAuthErrorMessage(error.message) };
  }
  return { success: true };
}
