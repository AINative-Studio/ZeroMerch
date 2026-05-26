// POST /api/gdpr/delete — GDPR right to erasure (Story 13.2, Issue #51)

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth";
import { deleteUserData, logGDPRRequest } from "@/app/actions/gdpr";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = session.role === "admin" || session.role === "company_admin";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });

  let body: { user_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { user_id: userId } = body;
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  if (!session.companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  try {
    await logGDPRRequest("deletion", userId, session.userId);
    const result = await deleteUserData(userId, session.companyId, session.userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Deletion failed" }, { status: 500 });
  }
}
