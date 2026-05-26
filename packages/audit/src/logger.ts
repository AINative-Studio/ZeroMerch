// AuditLogger — Story 13.1 (Issue #50)

import { ZeroDBClient } from "@zeromerch/zerodb";
import type { AuditEventInput, AuditEvent, ExportFilters } from "./types.js";

export class AuditLogger {
  private readonly db: ZeroDBClient;

  constructor(db?: ZeroDBClient) {
    this.db = db ?? new ZeroDBClient({
      projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec",
    });
  }

  async log(input: AuditEventInput): Promise<void> {
    await this.db.events().emit(input.event_type, {
      company_id: input.company_id,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      object_type: input.object_type,
      object_id: input.object_id,
      ...(input.payload ?? {}),
    });
  }

  async exportEvents(companyId: string, filters: ExportFilters = {}): Promise<AuditEvent[]> {
    const result = await this.db.events().list({ company_id: companyId } as never, 1, 500);
    const events = (result.data ?? []) as unknown as AuditEvent[];
    return events
      .filter((e) => {
        if (filters.event_type && e.event_type !== filters.event_type) return false;
        if (filters.actor_type && e.actor_type !== filters.actor_type) return false;
        if (filters.from && e.created_at < filters.from) return false;
        if (filters.to && e.created_at > filters.to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getEventHistory(objectType: string, objectId: string): Promise<AuditEvent[]> {
    const result = await this.db.events().list({ object_type: objectType, object_id: objectId } as never, 1, 100);
    return (result.data ?? []) as unknown as AuditEvent[];
  }
}

export const auditLogger = new AuditLogger();
