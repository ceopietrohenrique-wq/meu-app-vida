import type { Metadata } from "next";

import { SignUpForm } from "@/domains/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
      <SignUpForm />
    </div>
  );
}
