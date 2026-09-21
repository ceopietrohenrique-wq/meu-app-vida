import type { Metadata } from "next";

import { LoginForm } from "@/domains/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
      <LoginForm />
    </div>
  );
}
