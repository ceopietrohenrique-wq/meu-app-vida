"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/shared/lib/supabase/client";

import { getProfile } from "../services/profile-service";

export const profileQueryKey = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      return getProfile(supabase, user.id);
    },
  });
}
