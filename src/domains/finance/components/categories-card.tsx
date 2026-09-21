"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useCategories } from "../queries/use-categories";
import { CreateCategoryDialog } from "./create-category-dialog";
import type { FinanceViewContext } from "./finance-context-toggle";

export function CategoriesCard({
  viewContext,
}: {
  viewContext: FinanceViewContext;
}) {
  const context = viewContext === "empresarial" ? "empresarial" : "pessoal";
  const { data: categories = [], isLoading } = useCategories(
    viewContext === "consolidado" ? undefined : context,
  );

  return (
    <Card id="categorias">
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
        <CardDescription>
          Personalizadas por contexto — sem duplicar nome.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma categoria ainda.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="bg-muted rounded-full px-2.5 py-1 text-xs font-medium"
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
        <CreateCategoryDialog defaultContext={viewContext} />
      </CardContent>
    </Card>
  );
}
