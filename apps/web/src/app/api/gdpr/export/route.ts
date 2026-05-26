// POST /api/gdpr/export — GDPR data export (Story 13.2, Issue #51)

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth";
import { exportUserData, logGDPRRequest } from "@/app/actions/gdpr";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { user_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const userId = body.user_id ?? session.userId;
  const isAdmin = session.role === "admin" || session.role === "company_admin";
  if (!isAdmin && userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session.companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  try {
    await logGDPRRequest("export", userId, session.userId);
    const data = await exportUserData(userId, session.companyId);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Export failed" }, { status: 500 });
  }
}
