"use client";

import { useBusinesses } from "../queries/use-businesses";
import { CreateBusinessDialog } from "./create-business-dialog";

export function BusinessSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (businessId: string | null) => void;
}) {
  const { data: businesses = [] } = useBusinesses();

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Negócio"
        className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Todos os negócios</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <CreateBusinessDialog />
    </div>
  );
}
