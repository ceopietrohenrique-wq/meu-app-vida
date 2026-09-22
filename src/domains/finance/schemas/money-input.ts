// Movido para shared/lib/money-schema.ts na Fase 5 (2º domínio passou a
// precisar da mesma validação) — re-exportado aqui para não quebrar os
// imports existentes do domínio finance.
export {
  optionalMoneyInput,
  requiredMoneyInput,
} from "@/shared/lib/money-schema";
