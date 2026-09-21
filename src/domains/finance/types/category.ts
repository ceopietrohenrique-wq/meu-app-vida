import type { FinanceContext } from "./account";

export type Category = {
  id: string;
  name: string;
  context: FinanceContext;
  createdAt: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  context: FinanceContext;
  created_at: string;
};

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    context: row.context,
    createdAt: row.created_at,
  };
}
