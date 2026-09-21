"use client";

import { BibleStudyNotesCard } from "@/domains/spiritual/components/bible-study-notes-card";
import { DevotionalCard } from "@/domains/spiritual/components/devotional-card";
import { PrayersCard } from "@/domains/spiritual/components/prayers-card";
import { ReadingPlanCard } from "@/domains/spiritual/components/reading-plan-card";
import { SavedVersesCard } from "@/domains/spiritual/components/saved-verses-card";
import { SpiritualSearchCard } from "@/domains/spiritual/components/spiritual-search-card";
import { SpiritualXpCard } from "@/domains/spiritual/components/spiritual-xp-card";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { todayLocalDateString } from "@/shared/lib/date/local-date";

export default function SpiritualPage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const today = todayLocalDateString(profile.timezone);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Espiritual</h1>
        <SpiritualXpCard />
      </div>

      <DevotionalCard today={today} />
      <ReadingPlanCard today={today} />
      <PrayersCard today={today} />
      <BibleStudyNotesCard />
      <SavedVersesCard />
      <SpiritualSearchCard />
    </div>
  );
}
