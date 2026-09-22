"use client";

import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useUpdateCustomerStage } from "../mutations/use-customer-mutations";
import { useCustomers } from "../queries/use-customers";
import { CUSTOMER_STAGES } from "../schemas/customer-schema";
import { CreateCustomerDialog } from "./create-customer-dialog";
import { CustomerDetailDialog } from "./customer-detail-dialog";

const STAGE_LABEL: Record<string, string> = {
  possivel_cliente: "Possível cliente",
  contato_feito: "Contato feito",
  interessado: "Interessado",
  proposta_enviada: "Proposta enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export function CustomersCard({ businessId }: { businessId: string | null }) {
  const { data: customers = [], isLoading } = useCustomers(
    businessId ?? undefined,
  );
  const updateStage = useUpdateCustomerStage();

  async function handleStageChange(customerId: string, stage: string) {
    try {
      await updateStage.mutateAsync({
        customerId,
        stage: stage as (typeof CUSTOMER_STAGES)[number],
      });
    } catch {
      toast.error("Não foi possível atualizar o estágio.");
    }
  }

  return (
    <Card id="clientes">
      <CardHeader>
        <CardTitle>Clientes e leads</CardTitle>
        <CardDescription>
          Pipeline: possível cliente → fechado/perdido.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : customers.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhum lead/cliente ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customers.map((customer) => (
              <li
                key={customer.id}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {customer.company || customer.city || "—"}
                    {customer.nextActionDate
                      ? ` · próxima ação: ${customer.nextActionDate}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Estágio de ${customer.name}`}
                    className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
                    value={customer.stage}
                    onChange={(e) =>
                      handleStageChange(customer.id, e.target.value)
                    }
                  >
                    {CUSTOMER_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABEL[stage]}
                      </option>
                    ))}
                  </select>
                  <CustomerDetailDialog customer={customer} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <CreateCustomerDialog businessId={businessId} />
      </CardContent>
    </Card>
  );
}
