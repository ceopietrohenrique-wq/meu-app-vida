"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import { signOut } from "../services/auth-service";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    const result = await signOut();
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isPending}
    >
      <LogOut className="size-4" />
      {isPending ? "Saindo…" : "Sair"}
    </Button>
  );
}
