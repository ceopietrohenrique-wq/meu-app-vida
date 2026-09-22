"use client";

import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { useState } from "react";

import { BusinessDashboardCard } from "@/domains/business/components/business-dashboard-card";
import { BusinessSelector } from "@/domains/business/components/business-selector";
import { CatalogCard } from "@/domains/catalog/components/catalog-card";
import { CustomersCard } from "@/domains/crm/components/customers-card";
import { InventoryCard } from "@/domains/inventory/components/inventory-card";
import { OffersCard } from "@/domains/offers/components/offers-card";
import { SalesCard } from "@/domains/sales/components/sales-card";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { PeriodNavigator } from "@/shared/components/period-navigator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  parseLocalDateOnly,
  todayLocalDateString,
} from "@/shared/lib/date/local-date";

export default function BusinessPage() {
  const { data: profile, isLoading } = useProfile();
  const [businessId, setBusinessId] = useState<string | null>(null);
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
  const referenceDate = addMonths(parseLocalDateOnly(today), monthOffset);
  const periodStart = format(startOfMonth(referenceDate), "yyyy-MM-dd");
  const periodEnd = format(endOfMonth(referenceDate), "yyyy-MM-dd");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Negócios</h1>
        <BusinessSelector value={businessId} onChange={setBusinessId} />
        <PeriodNavigator
          referenceDate={referenceDate}
          monthOffset={monthOffset}
          onMonthOffsetChange={setMonthOffset}
        />
      </div>

      <BusinessDashboardCard
        periodStart={periodStart}
        periodEnd={periodEnd}
        businessId={businessId}
      />
      <SalesCard
        businessId={businessId}
        today={today}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
      <CustomersCard businessId={businessId} />
      <CatalogCard businessId={businessId} />
      <OffersCard businessId={businessId} />
      <InventoryCard businessId={businessId} />
    </div>
  );
}
