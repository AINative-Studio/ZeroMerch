// ---------------------------------------------------------------------------
// Cron — Campaign Scheduler (Story 7.3, Issue #28)
//
// GET /api/cron/campaigns
// Protected by CRON_SECRET header.
// Calls checkAndActivateCampaigns + checkAndExpireCampaigns for all companies.
// Vercel cron schedule: every 5 minutes (see vercel.json).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { ZeroDBClient } from "@zeromerch/zerodb";
import {
  checkAndActivateCampaigns,
  checkAndExpireCampaigns,
} from "@/app/actions/campaigns";
import type { Company } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cronSecret = process.env["CRON_SECRET"];
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const provided = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results: {
    companyId: string;
    activated: string[];
    expired: string[];
    warnings: string[];
  }[] = [];

  try {
    // Fetch all active companies
    const companiesTable = db.table("companies");
    const companiesResult = await companiesTable.query({ status: "active" }, 1, 500);
    const companies = (companiesResult.data ?? []) as Company[];

    console.log(`[CRON] Processing ${companies.length} companies`);

    // Process each company
    for (const company of companies) {
      const [activateResult, expireResult] = await Promise.all([
        checkAndActivateCampaigns(company.id),
        checkAndExpireCampaigns(company.id),
      ]);

      const activated = "activated" in activateResult ? activateResult.activated : [];
      const warnings = "warnings" in activateResult ? activateResult.warnings : [];
      const expired = "expired" in expireResult ? expireResult.expired : [];

      if (activated.length > 0 || expired.length > 0 || warnings.length > 0) {
        results.push({
          companyId: company.id,
          activated,
          expired,
          warnings,
        });
      }
    }

    const elapsed = Date.now() - startTime;
    const totalActivated = results.reduce((n, r) => n + r.activated.length, 0);
    const totalExpired = results.reduce((n, r) => n + r.expired.length, 0);
    const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);

    console.log(
      `[CRON] Done in ${elapsed}ms — activated=${totalActivated} expired=${totalExpired} warnings=${totalWarnings}`
    );

    return NextResponse.json({
      ok: true,
      elapsed_ms: elapsed,
      companies_processed: companies.length,
      campaigns_activated: totalActivated,
      campaigns_expired: totalExpired,
      inventory_warnings: totalWarnings,
      details: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    console.error("[CRON] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
