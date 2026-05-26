import { NextResponse } from "next/server";
import { getServerZeroDBClient } from "@/lib/zerodb-server";
import { getSession } from "@zeromerch/auth";

export async function GET(
  _req: Request,
  { params }: { params: { companySlug: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    const db = getServerZeroDBClient();
    const companyResult = await db.table("companies").query({ slug: params.companySlug, status: "active" }, 1, 1);
    const company = companyResult.data[0];
    if (!company) return NextResponse.json({ detail: "Not found" }, { status: 404 });
    if (session.user.company_id !== company.id) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    const budgetResult = await db.table("budgets").query(
      { company_id: company.id, owner_user_id: session.user.id, scope: "user", status: "active" }, 1, 1
    );
    return NextResponse.json(budgetResult.data[0] ?? null);
  } catch (err) {
    console.error("[api/store/budget]", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
