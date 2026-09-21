"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateRecurrenceInput } from "../schemas/recurrence-schema";
import {
  createRecurrence,
  generateRecurrenceOccurrences,
} from "../services/recurrence-service";

// Janela padrão de geração ao criar a recorrência (garante que a próxima
// ocorrência já exista, mesmo se o dia do mês já passou neste mês) e no
// botão manual de "gerar próximas" (CLAUDE.md > Fase 4 > 6 > previsões).
const LOOKAHEAD_DAYS = 60;

function useInvalidateAfterRecurrenceChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeRecurrences });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeTransactions });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeAccounts });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeDashboard });
  };
}

export function useCreateRecurrence() {
  const invalidate = useInvalidateAfterRecurrenceChange();
  return useMutation({
    mutationFn: async (input: CreateRecurrenceInput) => {
      const supabase = createClient();
      const recurrence = await createRecurrence(supabase, input);
      const until = format(addDays(new Date(), LOOKAHEAD_DAYS), "yyyy-MM-dd");
      await generateRecurrenceOccurrences(supabase, recurrence.id, until);
      return recurrence;
    },
    onSuccess: invalidate,
  });
}

export function useGenerateRecurrenceOccurrences() {
  const invalidate = useInvalidateAfterRecurrenceChange();
  return useMutation({
    mutationFn: (recurrenceId: string) => {
      const until = format(addDays(new Date(), LOOKAHEAD_DAYS), "yyyy-MM-dd");
      return generateRecurrenceOccurrences(createClient(), recurrenceId, until);
    },
    onSuccess: invalidate,
  });
}
