// withAudit HOF — Story 13.1 (Issue #50)

import type { AuditLogger } from "./logger.js";
import type { AuditActorType, AuditEventType } from "./types.js";

export interface AuditMiddlewareOptions<TArgs extends unknown[], TResult> {
  logger: AuditLogger;
  event_type: AuditEventType;
  object_type: string;
  getObjectId: (args: TArgs, result: TResult) => string;
  getCompanyId: (args: TArgs, result: TResult) => string;
  getActorId?: (args: TArgs) => string;
  getActorType?: (args: TArgs) => AuditActorType;
  getPayload?: (args: TArgs, result: TResult) => Record<string, unknown>;
}

export function withAudit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: AuditMiddlewareOptions<TArgs, TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await fn(...args);
    options.logger.log({
      company_id: options.getCompanyId(args, result),
      event_type: options.event_type,
      actor_type: options.getActorType ? options.getActorType(args) : "user",
      actor_id: options.getActorId ? options.getActorId(args) : "unknown",
      object_type: options.object_type,
      object_id: options.getObjectId(args, result),
      payload: options.getPayload ? options.getPayload(args, result) : undefined,
    }).catch((err: unknown) => { console.error("[audit] log failed:", err); });
    return result;
  };
}
