import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Os testes de RLS precisam de ` +
        `NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e ` +
        `SUPABASE_SERVICE_ROLE_KEY em .env.local, apontando para um projeto ` +
        `com as migrations de supabase/migrations já aplicadas.`,
    );
  }
  return value;
}

export function createAdminTestClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

/**
 * Cria um usuário real (via admin, já com e-mail confirmado) e retorna um
 * client autenticado como esse usuário — usando a chave anon, então sujeito
 * às mesmas policies de RLS que o app real usa em produção.
 */
export async function createTestUser(
  admin: SupabaseClient,
  label: string,
): Promise<TestUser> {
  const email = `rls-test-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const password = `Test-${Math.random().toString(36).slice(2)}!A1`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
  }

  const client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(
      `Falha ao autenticar usuário de teste: ${signInError.message}`,
    );
  }

  return { id: data.user.id, email, password, client };
}

export async function deleteTestUser(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
}
