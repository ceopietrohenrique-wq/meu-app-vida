"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

import { useProfile } from "../queries/use-profile";
import { ProfileForm } from "./profile-form";

export function ProfileSettings() {
  const { data: profile, isLoading, isError, refetch } = useProfile();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar seu perfil.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="self-start text-sm font-medium underline-offset-4 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <ProfileForm profile={profile} />;
}
