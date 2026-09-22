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

import { useInventoryLevels } from "../queries/use-inventory-levels";
import { LogInventoryMovementDialog } from "./log-inventory-movement-dialog";

export function InventoryCard({ businessId }: { businessId: string | null }) {
  const { data: levels = [], isLoading } = useInventoryLevels();
  const { data: catalogItems = [] } = useCatalogItems(businessId ?? undefined);

  const trackedItemIds = new Set(
    catalogItems.filter((i) => i.tracksInventory).map((i) => i.id),
  );
  const visibleLevels = levels.filter((l) =>
    trackedItemIds.has(l.catalogItemId),
  );

  function itemName(catalogItemId: string) {
    return catalogItems.find((c) => c.id === catalogItemId)?.name ?? "—";
  }

  return (
    <Card id="estoque">
      <CardHeader>
        <CardTitle>Estoque</CardTitle>
        <CardDescription>
          Só produtos com controle de estoque ativado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : visibleLevels.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhum item controla estoque ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleLevels.map((level) => {
              const low =
                level.minimumQuantity !== null &&
                level.quantityOnHand <= level.minimumQuantity;
              return (
                <li
                  key={level.catalogItemId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <p className="text-sm font-medium">
                    {itemName(level.catalogItemId)}
                  </p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      low ? "text-destructive" : ""
                    }`}
                  >
                    {level.quantityOnHand}
                    {level.minimumQuantity !== null && (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        / mín. {level.minimumQuantity}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <LogInventoryMovementDialog businessId={businessId} />
      </CardContent>
    </Card>
  );
}
