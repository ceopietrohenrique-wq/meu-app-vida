import type { SupabaseClient } from "@supabase/supabase-js";

import type { CalculateBmiInput } from "../schemas/bmi-schema";
import { calculateBmi } from "../utils/bmi";
import {
  mapBmiRecordRow,
  type BmiRecord,
  type BmiRecordRow,
} from "../types/bmi-record";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/** Salvar o cálculo é opcional (opt-in) — calcular não exige salvar. */
export async function saveBmiCalculation(
  supabase: SupabaseClient,
  input: CalculateBmiInput,
): Promise<BmiRecord> {
  const { bmi, category } = calculateBmi(input.weightKg, input.heightCm);

  const { data, error } = await supabase
    .from("bmi_records")
    .insert({
      weight_kg: input.weightKg,
      height_cm: input.heightCm,
      bmi,
      category,
    })
    .select("*")
    .single<BmiRecordRow>();

  if (error) throwFriendly("Não foi possível salvar o cálculo de IMC.");
  return mapBmiRecordRow(data!);
}

export async function listBmiCalculations(
  supabase: SupabaseClient,
): Promise<BmiRecord[]> {
  const { data, error } = await supabase
    .from("bmi_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<BmiRecordRow[]>();

  if (error) throwFriendly("Não foi possível carregar o histórico de IMC.");
  return (data ?? []).map(mapBmiRecordRow);
}
