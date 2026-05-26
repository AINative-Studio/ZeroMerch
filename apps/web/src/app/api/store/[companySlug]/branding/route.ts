import { NextResponse } from "next/server";
import { getServerZeroDBClient } from "@/lib/zerodb-server";

export async function GET(
  _req: Request,
  { params }: { params: { companySlug: string } }
) {
  try {
    const db = getServerZeroDBClient();
    const companyResult = await db.table("companies").query({ slug: params.companySlug, status: "active" }, 1, 1);
    const company = companyResult.data[0] ?? null;
    if (!company) return NextResponse.json({ company: null, brandKit: null }, { status: 404 });
    let brandKit = null;
    if (company.brand_kit_id) {
      try { brandKit = await db.table("brand_kits").get(company.brand_kit_id); } catch { brandKit = null; }
    }
    return NextResponse.json({ company, brandKit }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[api/store/branding]", err);
    return NextResponse.json({ company: null, brandKit: null }, { status: 500 });
  }
}
