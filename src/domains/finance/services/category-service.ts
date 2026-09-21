import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateCategoryInput } from "../schemas/category-schema";
import {
  type Category,
  type CategoryRow,
  mapCategoryRow,
} from "../types/category";
import type { FinanceContext } from "../types/account";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listCategories(
  supabase: SupabaseClient,
  context?: FinanceContext,
): Promise<Category[]> {
  let query = supabase.from("finance_categories").select("*").order("name");
  if (context) query = query.eq("context", context);

  const { data, error } = await query.returns<CategoryRow[]>();
  if (error) throwFriendly("Não foi possível carregar as categorias.");
  return (data ?? []).map(mapCategoryRow);
}

export async function createCategory(
  supabase: SupabaseClient,
  input: CreateCategoryInput,
): Promise<Category> {
  const { data, error } = await supabase
    .from("finance_categories")
    .insert({ name: input.name, context: input.context })
    .select("*")
    .single<CategoryRow>();

  if (error)
    throwFriendly(
      "Não foi possível criar a categoria (nome já existe nesse contexto?).",
    );
  return mapCategoryRow(data!);
}
