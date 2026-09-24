/**
 * Backup JSON estruturado — versão de schema explícita (nunca implícita
 * pelo formato) para permitir uma futura importação saber com qual
 * estrutura está lidando. Ver docs/business-rules.md > Exportação/Backup.
 */
export const BACKUP_SCHEMA_VERSION = 1;

export type BackupPayload = {
  backupFormat: "meu-app-vida-backup";
  schemaVersion: number;
  generatedAt: string;
  domains: Record<string, Record<string, unknown[]>>;
  notes: string[];
};
