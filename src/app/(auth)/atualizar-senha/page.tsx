import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/domains/auth/components/update-password-form";

export const metadata: Metadata = { title: "Definir nova senha" };

export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Nova senha</h1>
      <UpdatePasswordForm />
    </div>
  );
}
