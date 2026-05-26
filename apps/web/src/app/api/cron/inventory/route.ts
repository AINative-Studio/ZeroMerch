// ---------------------------------------------------------------------------
// Cron — Inventory Alert Sweep (Story 11.3, Issue #44)
//
// Runs daily at 09:00 UTC via Vercel Cron.
// Protected by CRON_SECRET header.
// Checks all companies for low-stock variants and logs alerts.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { ZeroDBClient } from "@zeromerch/zerodb";
import { checkInventoryAlerts, sendInventoryAlert } from "@/app/actions/inventory";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const cronSecret = process.env["CRON_SECRET"];
  const providedSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  console.log(`[inventory-cron] Starting sweep at ${startedAt}`);

  try {
    // Fetch all active companies
    const companiesTable = db.table("companies");
    const companiesResult = await companiesTable.query({ status: "active" }, 1, 500);
    const companies = companiesResult.data ?? [];

    console.log(
      `[inventory-cron] Checking ${companies.length} companies for low inventory`
    );

    let totalAlerts = 0;
    const companyResults: { company_id: string; alert_count: number }[] = [];

    for (const company of companies) {
      const alertsResult = await checkInventoryAlerts(company.id);

      if ("error" in alertsResult) {
        console.error(
          `[inventory-cron] Error checking company ${company.id}: ${alertsResult.error}`
        );
        continue;
      }

      const { alerts } = alertsResult;

      if (alerts.length === 0) {
        continue;
      }

      console.log(
        `[inventory-cron] Company ${company.id} (${company.name}): ${alerts.length} low-stock alerts`
      );

      // Send alert for each low-stock variant
      for (const alert of alerts) {
        await sendInventoryAlert(
          alert.variant.id,
          alert.currentCount,
          alert.suggestedReorder
        );
      }

      totalAlerts += alerts.length;
      companyResults.push({
        company_id: company.id,
        alert_count: alerts.length,
      });
    }

    const completedAt = new Date().toISOString();
    console.log(
      `[inventory-cron] Sweep complete at ${completedAt}. Total alerts: ${totalAlerts}`
    );

    return NextResponse.json({
      ok: true,
      started_at: startedAt,
      completed_at: completedAt,
      companies_checked: companies.length,
      total_alerts: totalAlerts,
      by_company: companyResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron sweep failed";
    console.error("[inventory-cron] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
