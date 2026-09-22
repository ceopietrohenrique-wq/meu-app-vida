import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateOfferInput } from "../schemas/offer-schema";
import {
  mapOfferItemRow,
  mapOfferRow,
  type Offer,
  type OfferItemRow,
  type OfferRow,
} from "../types/offer";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listOffers(
  supabase: SupabaseClient,
  businessId?: string,
): Promise<Offer[]> {
  let query = supabase.from("offers").select("*").order("name");
  if (businessId) query = query.eq("business_id", businessId);

  const { data: offerRows, error } = await query.returns<OfferRow[]>();
  if (error) throwFriendly("Não foi possível carregar as ofertas.");
  if (!offerRows || offerRows.length === 0) return [];

  const { data: itemRows, error: itemsError } = await supabase
    .from("offer_items")
    .select("*")
    .in(
      "offer_id",
      offerRows.map((o) => o.id),
    )
    .returns<(OfferItemRow & { offer_id: string })[]>();
  if (itemsError)
    throwFriendly("Não foi possível carregar os itens das ofertas.");

  return offerRows.map((row) =>
    mapOfferRow(
      row,
      (itemRows ?? [])
        .filter((i) => i.offer_id === row.id)
        .map(mapOfferItemRow),
    ),
  );
}

export async function createOffer(
  supabase: SupabaseClient,
  input: CreateOfferInput,
): Promise<Offer> {
  const { data: offerRow, error } = await supabase
    .from("offers")
    .insert({
      business_id: input.businessId || null,
      name: input.name,
      description: input.description || null,
      discount_type: input.discountType || null,
      discount_value: !input.discountType
        ? null
        : input.discountType === "percent"
          ? (input.discountPercent ?? 0)
          : centsToDecimalString(input.discountFixedCents ?? 0),
    })
    .select("*")
    .single<OfferRow>();

  if (error) throwFriendly("Não foi possível criar a oferta.");

  const { data: itemRows, error: itemsError } = await supabase
    .from("offer_items")
    .insert(
      input.items.map((item) => ({
        offer_id: offerRow!.id,
        catalog_item_id: item.catalogItemId,
        quantity: item.quantity,
      })),
    )
    .select("*")
    .returns<OfferItemRow[]>();

  if (itemsError) throwFriendly("Não foi possível salvar os itens da oferta.");

  return mapOfferRow(offerRow!, (itemRows ?? []).map(mapOfferItemRow));
}
