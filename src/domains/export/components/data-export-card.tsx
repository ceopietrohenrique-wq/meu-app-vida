"use client";

import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import {
  useDownloadBackup,
  useExportSalesCsv,
  useExportTransactionsCsv,
} from "../mutations/use-export-mutations";

/**
 * "Dados e backup" em Configurações — exporta só o que pertence ao usuário
 * autenticado (cada mutation chama o client autenticado normal, protegido
 * por RLS; nunca um userId vindo do browser, nunca service_role). Cada
 * botão desabilita durante o próprio download (isPending) — impede
 * double-submit igual ao resto do app.
 */
export function DataExportCard() {
  const exportTransactions = useExportTransactionsCsv();
  const exportSales = useExportSalesCsv();
  const downloadBackup = useDownloadBackup();

  async function handle(
    mutation: { mutateAsync: () => Promise<void> },
    successMessage: string,
    errorMessage: string,
  ) {
    try {
      await mutation.mutateAsync();
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Exporta só os seus próprios dados. Nenhum arquivo é enviado para fora
        desta aplicação.
      </p>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={exportTransactions.isPending}
          onClick={() =>
            handle(
              exportTransactions,
              "Transações exportadas.",
              "Não foi possível exportar as transações. Tente novamente.",
            )
          }
        >
          {exportTransactions.isPending
            ? "Exportando…"
            : "Exportar transações CSV"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={exportSales.isPending}
          onClick={() =>
            handle(
              exportSales,
              "Vendas exportadas.",
              "Não foi possível exportar as vendas. Tente novamente.",
            )
          }
        >
          {exportSales.isPending ? "Exportando…" : "Exportar vendas CSV"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={downloadBackup.isPending}
          onClick={() =>
            handle(
              downloadBackup,
              "Backup gerado.",
              "Não foi possível gerar o backup. Tente novamente.",
            )
          }
        >
          {downloadBackup.isPending ? "Gerando…" : "Baixar backup JSON"}
        </Button>
      </div>
    </div>
  );
}
