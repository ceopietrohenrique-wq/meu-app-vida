export type InboxStatus = "inbox" | "processado" | "arquivado";

export type InboxItem = {
  id: string;
  content: string;
  status: InboxStatus;
  createdAt: string;
};

export type InboxItemRow = {
  id: string;
  content: string;
  status: InboxStatus;
  created_at: string;
};

export function mapInboxItemRow(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}
