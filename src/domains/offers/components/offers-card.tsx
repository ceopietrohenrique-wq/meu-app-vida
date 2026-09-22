"use client";

import { useCatalogItems } from "@/domains/catalog/queries/use-catalog-items";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useOffers } from "../queries/use-offers";
import { CreateOfferDialog } from "./create-offer-dialog";
import { computeOfferPricing } from "../utils/offer-pricing";

export function OffersCard({ businessId }: { businessId: string | null }) {
  const { data: offers = [], isLoading } = useOffers(businessId ?? undefined);
  const { data: catalogItems = [] } = useCatalogItems(businessId ?? undefined);

  return (
    <Card id="ofertas">
      <CardHeader>
        <CardTitle>Kits e ofertas</CardTitle>
        <CardDescription>
          Templates — vender uma oferta nunca altera o preço do template.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : offers.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma oferta ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {offers.map((offer) => {
              const pricing = computeOfferPricing(
                offer.items.map((item) => {
                  const catalogItem = catalogItems.find(
                    (c) => c.id === item.catalogItemId,
                  );
                  return {
                    quantity: item.quantity,
                    unitPriceCents:
                      item.unitPriceOverrideCents ??
                      catalogItem?.defaultPriceCents ??
                      0,
                    unitCostCents: catalogItem?.defaultCostCents ?? 0,
                  };
                }),
                offer.discountType === "percent"
                  ? { type: "percent", value: offer.discountValue ?? 0 }
                  : offer.discountType === "fixed"
                    ? { type: "fixed", value: offer.discountValue ?? 0 }
                    : null,
              );

              return (
                <li
                  key={offer.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{offer.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {offer.items.length}{" "}
                      {offer.items.length === 1 ? "item" : "itens"} · margem
                      estimada{" "}
                      {pricing.estimatedMarginPercent === null
                        ? "—"
                        : `${pricing.estimatedMarginPercent.toFixed(0)}%`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrencyBRL(pricing.finalPriceCents)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <CreateOfferDialog businessId={businessId} />
      </CardContent>
    </Card>
  );
}
