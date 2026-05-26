// GET /api/audit/export — Admin audit log export (Story 13.1, Issue #50)

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth";
import { AuditLogger } from "@zeromerch/audit";
import type { ExportFilters } from "@zeromerch/audit";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "company_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("company_id") ?? session.companyId;
  if (!companyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });

  const filters: ExportFilters = {};
  const et = searchParams.get("event_type");
  const at = searchParams.get("actor_type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (et) filters.event_type = et as ExportFilters["event_type"];
  if (at) filters.actor_type = at as ExportFilters["actor_type"];
  if (from) filters.from = from;
  if (to) filters.to = to;

  try {
    const logger = new AuditLogger();
    const events = await logger.exportEvents(companyId, filters);
    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Export failed" }, { status: 500 });
  }
}
