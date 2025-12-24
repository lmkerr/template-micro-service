import type { AuditDb } from './audit-db.type';

interface ThingDb extends AuditDb {
  id: string;
  name: string;
  description?: string;
}

export type { ThingDb };
