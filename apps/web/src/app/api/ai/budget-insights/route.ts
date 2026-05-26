import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth/server";
import { analyzeBudgetSpend } from "@zeromerch/agents";

// GET /api/ai/budget-insights?company_id=...
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId =
    req.nextUrl.searchParams.get("company_id") ?? session.user.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  // Scope check — users can only query their own company
  if (companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const insights = await analyzeBudgetSpend(companyId);
    return NextResponse.json({ insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
