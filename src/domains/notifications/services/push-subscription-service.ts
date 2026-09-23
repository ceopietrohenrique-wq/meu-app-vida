import type { SupabaseClient } from "@supabase/supabase-js";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/**
 * Grava a subscription do dispositivo atual — chaves PÚBLICAS que o
 * próprio browser gerou (endpoint/p256dh/auth), nunca um secret do
 * servidor. `unique(user_id, endpoint)` faz o upsert ser idempotente:
 * resubscrever no mesmo dispositivo nunca cria uma segunda linha.
 */
export async function savePushSubscription(
  supabase: SupabaseClient,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  if (!subscription.endpoint || !subscription.keys) {
    throwFriendly("Subscription de push inválida.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
      is_active: true,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) throwFriendly("Não foi possível salvar a subscription de push.");
}

export async function deactivatePushSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);

  if (error)
    throwFriendly("Não foi possível desativar a subscription de push.");
}

export async function hasActivePushSubscription(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) throwFriendly("Não foi possível verificar as subscriptions.");
  return (count ?? 0) > 0;
}
