import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateMeasurementInput } from "../schemas/measurement-schema";
import {
  mapBodyMeasurementRow,
  type BodyMeasurement,
  type BodyMeasurementRow,
} from "../types/measurement";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listMeasurements(
  supabase: SupabaseClient,
): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .order("date", { ascending: false })
    .returns<BodyMeasurementRow[]>();

  if (error) throwFriendly("Não foi possível carregar as medidas.");
  return (data ?? []).map(mapBodyMeasurementRow);
}

export async function createMeasurement(
  supabase: SupabaseClient,
  input: CreateMeasurementInput,
): Promise<BodyMeasurement> {
  const { data, error } = await supabase
    .from("body_measurements")
    .insert({
      date: input.date,
      waist_cm: input.waistCm ?? null,
      hip_cm: input.hipCm ?? null,
      chest_cm: input.chestCm ?? null,
      arm_cm: input.armCm ?? null,
      thigh_cm: input.thighCm ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single<BodyMeasurementRow>();

  if (error) throwFriendly("Não foi possível salvar a medida.");
  return mapBodyMeasurementRow(data!);
}
