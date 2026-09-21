"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/shared/lib/supabase/client";

import { profileQueryKey } from "../queries/use-profile";
import type { UpdateProfileInput } from "../schemas/profile-schema";
import { updateProfile } from "../services/profile-service";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      return updateProfile(supabase, user.id, input);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
    },
  });
}
