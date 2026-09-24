"use client";

import { useMutation } from "@tanstack/react-query";

import { exportTransactionsCsv } from "@/domains/finance/services/export-service";
import { exportSalesCsv } from "@/domains/sales/services/export-service";
import { downloadTextFile } from "@/shared/lib/export/csv";
import { createClient } from "@/shared/lib/supabase/client";

import { buildUserBackup } from "../services/backup-service";

function todayFileDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useExportTransactionsCsv() {
  return useMutation({
    mutationFn: async () => {
      const csv = await exportTransactionsCsv(createClient());
      downloadTextFile(
        `transacoes-${todayFileDate()}.csv`,
        csv,
        "text/csv;charset=utf-8",
      );
    },
  });
}

export function useExportSalesCsv() {
  return useMutation({
    mutationFn: async () => {
      const csv = await exportSalesCsv(createClient());
      downloadTextFile(
        `vendas-${todayFileDate()}.csv`,
        csv,
        "text/csv;charset=utf-8",
      );
    },
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: async () => {
      const backup = await buildUserBackup(createClient());
      downloadTextFile(
        `backup-meu-app-vida-${todayFileDate()}.json`,
        JSON.stringify(backup, null, 2),
        "application/json;charset=utf-8",
      );
    },
  });
}
