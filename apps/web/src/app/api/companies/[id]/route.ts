// ---------------------------------------------------------------------------
// API Route: /api/companies/[id]
// GET — fetch a single company by ID
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth";
import { getCompany } from "@/app/actions/company";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await getCompany(params.id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company);
}
