import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@zeromerch/auth/server";
import { reviewDesignAsset, overrideReview } from "@zeromerch/agents";
import type { ReviewStatus } from "@zeromerch/agents";

// POST /api/ai/brand-review — trigger review
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { asset_id?: string; company_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { asset_id, company_id } = body;
  if (!asset_id) return NextResponse.json({ error: "asset_id is required" }, { status: 400 });

  const companyId = company_id ?? session.user.companyId;
  if (!companyId) return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  if (companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const review = await reviewDesignAsset(asset_id, companyId);
    return NextResponse.json({ review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to review asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/ai/brand-review — human override
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { review_id?: string; new_status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { review_id, new_status } = body;
  if (!review_id) return NextResponse.json({ error: "review_id is required" }, { status: 400 });

  const validStatuses: ReviewStatus[] = ["approved", "rejected", "needs_human_review"];
  if (!new_status || !validStatuses.includes(new_status as ReviewStatus)) {
    return NextResponse.json(
      { error: `new_status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const review = await overrideReview(
      review_id,
      new_status as ReviewStatus,
      session.user.id
    );
    return NextResponse.json({ review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to override review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
