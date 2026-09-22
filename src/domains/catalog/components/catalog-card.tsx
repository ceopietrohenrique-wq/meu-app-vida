"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useCatalogItems } from "../queries/use-catalog-items";
import { CreateCatalogItemDialog } from "./create-catalog-item-dialog";

export function CatalogCard({ businessId }: { businessId: string | null }) {
  const { data: items = [], isLoading } = useCatalogItems(
    businessId ?? undefined,
  );

  return (
    <Card id="catalogo">
      <CardHeader>
        <CardTitle>Catálogo</CardTitle>
        <CardDescription>
          Produtos e serviços — preço/custo padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhum item ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {item.name}
                    {!item.isActive && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (inativo)
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {item.type === "produto" ? "Produto" : "Serviço"}
                    {item.tracksInventory ? " · controla estoque" : ""}
                    {item.category ? ` · ${item.category}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrencyBRL(item.defaultPriceCents)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <CreateCatalogItemDialog businessId={businessId} />
      </CardContent>
    </Card>
  );
}
