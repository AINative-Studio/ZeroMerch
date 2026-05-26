// Audit Logging Types — Story 13.1 (Issue #50)

export type AuditActorType = "user" | "agent" | "system" | "webhook";

export type AuditEventType =
  | "campaign.published"
  | "order.created"
  | "order.paid"
  | "order.refunded"
  | "redemption_link.created"
  | "redemption_link.used"
  | "redemption_link.revoked"
  | "approval.created"
  | "approval.resolved"
  | "gdpr.export_requested"
  | "gdpr.deletion_requested"
  | "gdpr.user_deleted"
  | "budget.created"
  | "budget.updated"
  | "budget.exhausted"
  | string;

export interface AuditEventInput {
  company_id: string;
  event_type: AuditEventType;
  actor_type: AuditActorType;
  actor_id: string;
  object_type: string;
  object_id: string;
  payload?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  processed: boolean;
  created_at: string;
}

export interface ExportFilters {
  event_type?: AuditEventType;
  actor_type?: AuditActorType;
  from?: string;
  to?: string;
}
