// ---------------------------------------------------------------------------
// API Route: /api/companies
// POST — create a company
// GET  — list companies (for the authenticated user's tenant)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth";
import { createCompany } from "@/app/actions/company";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { name, slug, domain, default_currency } = body as Record<string, unknown>;

  if (typeof name !== "string" || typeof slug !== "string") {
    return NextResponse.json(
      { error: "name and slug are required strings" },
      { status: 400 }
    );
  }

  const result = await createCompany({
    name,
    slug,
    domain: typeof domain === "string" ? domain : undefined,
    default_currency: typeof default_currency === "string" ? default_currency : "USD",
  });

  if ("error" in result) {
    const msg = result.error ?? "Unknown error";
    const status = msg.includes("already taken") ? 409 : 422;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json(result.company, { status: 201 });
}
