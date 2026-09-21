"use client";

import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { useState } from "react";

import { AccountsCard } from "@/domains/finance/components/accounts-card";
import { BudgetsCard } from "@/domains/finance/components/budgets-card";
import { CategoriesCard } from "@/domains/finance/components/categories-card";
import { FinanceContextToggle } from "@/domains/finance/components/finance-context-toggle";
import type { FinanceViewContext } from "@/domains/finance/components/finance-context-toggle";
import { FinanceDashboardCard } from "@/domains/finance/components/finance-dashboard-card";
import { PeriodNavigator } from "@/domains/finance/components/period-navigator";
import { RecurrencesCard } from "@/domains/finance/components/recurrences-card";
import { TransactionsListCard } from "@/domains/finance/components/transactions-list-card";
import { UpcomingTransactionsCard } from "@/domains/finance/components/upcoming-transactions-card";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  parseLocalDateOnly,
  todayLocalDateString,
} from "@/shared/lib/date/local-date";

export default function FinancePage() {
  const { data: profile, isLoading } = useProfile();
  const [viewContext, setViewContext] = useState<FinanceViewContext>("pessoal");
  const [monthOffset, setMonthOffset] = useState(0);

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const today = todayLocalDateString(profile.timezone);
  // parseLocalDateOnly (não `new Date(today)`) evita deslocar o dia 1 do mês
  // para o mês anterior em timezones atrás de UTC ao calcular
  // startOfMonth/endOfMonth (ver shared/lib/date/local-date.ts).
  const referenceDate = addMonths(parseLocalDateOnly(today), monthOffset);
  const periodStart = format(startOfMonth(referenceDate), "yyyy-MM-dd");
  const periodEnd = format(endOfMonth(referenceDate), "yyyy-MM-dd");
  const periodMonth = format(referenceDate, "yyyy-MM");
  const upcomingWindowEnd = format(
    addDays(parseLocalDateOnly(today), 30),
    "yyyy-MM-dd",
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <FinanceContextToggle value={viewContext} onChange={setViewContext} />
        <PeriodNavigator
          referenceDate={referenceDate}
          monthOffset={monthOffset}
          onMonthOffsetChange={setMonthOffset}
        />
      </div>

      <FinanceDashboardCard
        viewContext={viewContext}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
      <AccountsCard context={viewContext} />
      <UpcomingTransactionsCard
        today={today}
        viewContext={viewContext}
        windowEnd={upcomingWindowEnd}
      />
      <TransactionsListCard
        today={today}
        viewContext={viewContext}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
      <BudgetsCard
        viewContext={viewContext}
        periodMonth={periodMonth}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
      <RecurrencesCard viewContext={viewContext} today={today} />
      <CategoriesCard viewContext={viewContext} />
    </div>
  );
}
