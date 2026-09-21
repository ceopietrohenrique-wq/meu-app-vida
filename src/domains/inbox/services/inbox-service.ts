import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapInboxItemRow,
  type InboxItem,
  type InboxItemRow,
} from "../types/inbox-item";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listInboxItems(
  supabase: SupabaseClient,
): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("inbox_items")
    .select("*")
    .eq("status", "inbox")
    .order("created_at", { ascending: false })
    .returns<InboxItemRow[]>();

  if (error) throwFriendly("Não foi possível carregar a inbox.");
  return (data ?? []).map(mapInboxItemRow);
}

export async function captureToInbox(
  supabase: SupabaseClient,
  content: string,
): Promise<InboxItem> {
  const { data, error } = await supabase
    .from("inbox_items")
    .insert({ content })
    .select("*")
    .single<InboxItemRow>();

  if (error) throwFriendly("Não foi possível salvar na inbox.");
  return mapInboxItemRow(data!);
}

export async function archiveInboxItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("inbox_items")
    .update({ status: "arquivado" })
    .eq("id", itemId);

  if (error) throwFriendly("Não foi possível arquivar o item.");
}

export async function convertInboxItemToTask(
  supabase: SupabaseClient,
  itemId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase.rpc("convert_inbox_item_to_task", {
    p_item_id: itemId,
    p_title: title,
  });

  if (error) throwFriendly("Não foi possível transformar o item em tarefa.");
}
