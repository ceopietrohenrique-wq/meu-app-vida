import type { Metadata } from "next";

import { InboxList } from "@/domains/inbox/components/inbox-list";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Tudo que você capturou rapidamente e ainda não organizou.
        </p>
      </div>
      <InboxList />
    </div>
  );
}
