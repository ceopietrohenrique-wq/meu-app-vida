import type { Metadata } from "next";

import { ProfileSettings } from "@/domains/settings/components/profile-settings";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
      <ProfileSettings />
    </div>
  );
}
