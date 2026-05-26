"use server";

// ---------------------------------------------------------------------------
// Server Actions — Analytics Engine (Stories 12.1, 12.2, 12.3)
//                  Issues #46, #47, #48
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

export interface TopProduct {
  product_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CampaignAnalytics {
  totalRedemptions: number;
  unusedLinks: number;
  expiredLinks: number;
  totalSpend: number;
  topProducts: TopProduct[];
  estimatedROI: number;
  totalLinks: number;
  redemptionRate: number;
}

export interface DepartmentSpendRow {
  department_id: string;
  name: string;
  spend: number;
  budget_limit: number;
  pct_used: number;
  overage: boolean;
}

export interface CategorySpend {
  category: string;
  spend: number;
  pct: number;
}

export interface MonthlyTrend {
  month: string;
  spend: number;
}

export interface CompanySpendSummary {
  totalSpend: number;
  annualBudget: number;
  annualPctUsed: number;
  spendByDepartment: DepartmentSpendRow[];
  spendByCategory: CategorySpend[];
  monthlyTrend: MonthlyTrend[];
}

export interface DepartmentSpend {
  departments: {
    department_id: string;
    name: string;
    spend: number;
    budget: number;
    overage: boolean;
    pct_used: number;
  }[];
}

export interface AIInsights {
  waste: string[];
  popular: string[];
  inefficiencies: string[];
  vendorRecs: string[];
  generatedAt: string;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getLast6Months(): { label: string; start: Date; end: Date }[] {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({ label: formatMonth(start), start, end });
  }
  return months;
}

export async function getCampaignAnalytics(
  campaignId: string
): Promise<CampaignAnalytics | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!campaignId) return { error: "campaignId is required" };

  try {
    const linksResult = await db.table("redemption_links").query({ campaign_id: campaignId }, 1, 1000);
    const links = linksResult.data ?? [];
    const totalLinks = links.length;
    const usedLinks = links.filter((l) => l["status"] === "used").length;
    const unusedLinks = links.filter((l) => l["status"] === "unused").length;
    const expiredLinks = links.filter((l) => l["status"] === "expired" || l["status"] === "revoked").length;

    const ordersResult = await db.table("orders").query({ campaign_id: campaignId }, 1, 1000);
    const orders = ordersResult.data ?? [];
    const paidStatuses = new Set(["paid", "fulfilled", "shipped", "delivered"]);
    const totalSpend = orders
      .filter((o) => paidStatuses.has(o["status"] as string))
      .reduce((sum, o) => sum + ((o["total"] as number) ?? 0), 0);

    const productTotals = new Map<string, { quantity: number; revenue: number }>();
    for (const orderId of orders.map((o) => o["id"] as string)) {
      const itemsResult = await db.table("order_items").query({ order_id: orderId }, 1, 100);
      for (const item of itemsResult.data ?? []) {
        const pid = item["product_id"] as string;
        const qty = (item["quantity"] as number) ?? 0;
        const rev = ((item["unit_price"] as number) ?? 0) * qty;
        const ex = productTotals.get(pid) ?? { quantity: 0, revenue: 0 };
        productTotals.set(pid, { quantity: ex.quantity + qty, revenue: ex.revenue + rev });
      }
    }

    const topProducts: TopProduct[] = [];
    for (const [productId, totals] of productTotals.entries()) {
      try {
        const product = await db.table("products").get(productId);
        topProducts.push({ product_id: productId, name: (product["name"] as string) ?? "Unknown Product", quantity: totals.quantity, revenue: totals.revenue });
      } catch {
        topProducts.push({ product_id: productId, name: "Unknown Product", quantity: totals.quantity, revenue: totals.revenue });
      }
    }
    topProducts.sort((a, b) => b.quantity - a.quantity);

    const totalRedemptions = usedLinks;
    const redemptionRate = totalLinks > 0 ? (totalRedemptions / totalLinks) * 100 : 0;
    const estimatedROI = totalRedemptions > 0 ? totalSpend / totalRedemptions : 0;
    return { totalRedemptions, unusedLinks, expiredLinks, totalSpend, topProducts: topProducts.slice(0, 10), estimatedROI, totalLinks, redemptionRate };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to get campaign analytics" };
  }
}

export async function getCompanySpendSummary(
  companyId: string
): Promise<CompanySpendSummary | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!companyId) return { error: "companyId is required" };

  try {
    const [deptResult, budgetsResult, ordersResult] = await Promise.all([
      db.table("departments").query({ company_id: companyId }, 1, 200),
      db.table("budgets").query({ company_id: companyId }, 1, 200),
      db.table("orders").query({ company_id: companyId }, 1, 5000),
    ]);

    const departments = deptResult.data ?? [];
    const budgets = budgetsResult.data ?? [];
    const allOrders = ordersResult.data ?? [];

    const budgetMap = new Map<string, { limit: number; spent: number }>();
    for (const b of budgets) {
      budgetMap.set(b["id"] as string, { limit: (b["limit_amount"] as number) ?? 0, spent: (b["spent_amount"] as number) ?? 0 });
    }

    const paidStatuses = new Set(["paid", "fulfilled", "shipped", "delivered"]);
    const paidOrders = allOrders.filter((o) => paidStatuses.has(o["status"] as string));
    const totalSpend = paidOrders.reduce((sum, o) => sum + ((o["total"] as number) ?? 0), 0);

    const annualBudgets = budgets.filter((b) => b["period"] === "annual" || b["scope"] === "company");
    const annualBudget = annualBudgets.length > 0
      ? annualBudgets.reduce((sum, b) => sum + ((b["limit_amount"] as number) ?? 0), 0)
      : budgets.reduce((sum, b) => sum + ((b["limit_amount"] as number) ?? 0), 0);
    const annualPctUsed = annualBudget > 0 ? Math.min(100, (totalSpend / annualBudget) * 100) : 0;

    const spendByDepartment: DepartmentSpendRow[] = departments.map((dept) => {
      const budgetId = dept["budget_id"] as string | undefined;
      const budget = budgetId ? budgetMap.get(budgetId) : undefined;
      const budget_limit = budget?.limit ?? 0;
      const spend = budget?.spent ?? 0;
      const pct_used = budget_limit > 0 ? Math.min(100, (spend / budget_limit) * 100) : 0;
      return { department_id: dept["id"] as string, name: (dept["name"] as string) ?? "Unnamed Department", spend, budget_limit, pct_used, overage: spend > budget_limit && budget_limit > 0 };
    });

    const categorySpendMap = new Map<string, number>();
    for (const order of paidOrders) {
      try {
        const itemsResult = await db.table("order_items").query({ order_id: order["id"] as string }, 1, 100);
        for (const item of itemsResult.data ?? []) {
          const lineTotal = ((item["quantity"] as number) ?? 1) * ((item["unit_price"] as number) ?? 0);
          try {
            const product = await db.table("products").get(item["product_id"] as string);
            const category = (product["category"] as string) ?? "uncategorized";
            categorySpendMap.set(category, (categorySpendMap.get(category) ?? 0) + lineTotal);
          } catch { categorySpendMap.set("uncategorized", (categorySpendMap.get("uncategorized") ?? 0) + lineTotal); }
        }
      } catch { /* skip */ }
    }

    const categoryTotal = Array.from(categorySpendMap.values()).reduce((a, b) => a + b, 0);
    const spendByCategory: CategorySpend[] = Array.from(categorySpendMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, spend]) => ({ category, spend, pct: categoryTotal > 0 ? (spend / categoryTotal) * 100 : 0 }));

    const months = getLast6Months();
    const monthlyTrend: MonthlyTrend[] = months.map(({ label, start, end }) => ({
      month: label,
      spend: paidOrders.filter((o) => { const d = new Date(o["created_at"] as string); return d >= start && d <= end; }).reduce((sum, o) => sum + ((o["total"] as number) ?? 0), 0),
    }));

    return { totalSpend, annualBudget, annualPctUsed, spendByDepartment, spendByCategory, monthlyTrend };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to get spend summary" };
  }
}

export async function getDepartmentSpend(
  companyId: string,
  departmentId?: string
): Promise<DepartmentSpend | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!companyId) return { error: "companyId is required" };

  try {
    const filter: Record<string, unknown> = { company_id: companyId };
    if (departmentId) filter["id"] = departmentId;
    const deptResult = await db.table("departments").query(filter, 1, 200);

    const departments_out: DepartmentSpend["departments"] = [];
    for (const dept of deptResult.data ?? []) {
      const budgetId = dept["budget_id"] as string | undefined;
      let spend = 0; let budget = 0;
      if (budgetId) {
        try {
          const b = await db.table("budgets").get(budgetId);
          spend = (b["spent_amount"] as number) ?? 0;
          budget = (b["limit_amount"] as number) ?? 0;
        } catch { /* Budget not found */ }
      }
      const pct_used = budget > 0 ? Math.min(100, (spend / budget) * 100) : 0;
      departments_out.push({ department_id: dept["id"] as string, name: (dept["name"] as string) ?? "Unnamed", spend, budget, overage: spend > budget && budget > 0, pct_used });
    }
    return { departments: departments_out };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to get department spend" };
  }
}

export async function getAIInsights(
  companyId: string
): Promise<AIInsights | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!companyId) return { error: "companyId is required" };

  try {
    const eventsTable = db.table("events");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const cachedResult = await eventsTable.query({ company_id: companyId, event_type: "ai_insights_generated" }, 1, 10);
    const cachedEvents = (cachedResult.data ?? []).filter((e) => e["created_at"] && new Date(e["created_at"] as string) > new Date(oneHourAgo));

    if (cachedEvents.length > 0) {
      cachedEvents.sort((a, b) => new Date(b["created_at"] as string).getTime() - new Date(a["created_at"] as string).getTime());
      const rawPayload = cachedEvents[0]!["payload"] as unknown;
      const payload = rawPayload != null && typeof rawPayload === "object" ? (rawPayload as AIInsights) : undefined;
      if (payload && Array.isArray(payload.waste) && Array.isArray(payload.popular)) return payload;
    }

    const summary = await buildInsightsSummary(companyId);
    const anthropic = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
    const promptLines = [
      "Analyze this corporate merch spend data and identify:",
      "1. Waste (unredeemed credits, expired links, cancelled orders)",
      "2. Popular products (highest redemption rates)",
      "3. Budget inefficiencies (departments consistently under/over budget)",
      "4. Vendor recommendations based on quality scores and lead times",
      "",
      "Data: " + JSON.stringify(summary, null, 2),
      "",
      'Respond in JSON only (no markdown, no explanation): { "waste": string[], "popular": string[], "inefficiencies": string[], "vendorRecs": string[] }',
    ];
    const prompt = promptLines.join("\n");

    const response = await anthropic.messages.create({ model: "claude-sonnet-4-6", max_tokens: 1024, messages: [{ role: "user", content: prompt }] });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const jsonText = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: AIInsights;
    try {
      const raw = JSON.parse(jsonText) as { waste?: string[]; popular?: string[]; inefficiencies?: string[]; vendorRecs?: string[] };
      parsed = { waste: raw.waste ?? [], popular: raw.popular ?? [], inefficiencies: raw.inefficiencies ?? [], vendorRecs: raw.vendorRecs ?? [], generatedAt: new Date().toISOString() };
    } catch {
      parsed = { waste: ["Unable to parse AI response"], popular: [], inefficiencies: [], vendorRecs: [], generatedAt: new Date().toISOString() };
    }

    await eventsTable.insert({ company_id: companyId, event_type: "ai_insights_generated", actor_type: "agent", actor_id: "ai_insights_agent", object_type: "company", object_id: companyId, payload: parsed as unknown as Record<string, unknown>, processed: true, created_at: new Date().toISOString() });
    return parsed;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to generate AI insights" };
  }
}

async function buildInsightsSummary(companyId: string): Promise<object> {
  const [ordersResult, linksResult, budgetsResult, vendorsResult] = await Promise.all([
    db.table("orders").query({ company_id: companyId }, 1, 1000),
    db.table("redemption_links").query({ company_id: companyId }, 1, 1000),
    db.table("budgets").query({ company_id: companyId }, 1, 200),
    db.table("vendors").query({}, 1, 50),
  ]);

  const orders = ordersResult.data ?? [];
  const links = linksResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const vendors = vendorsResult.data ?? [];

  const paidStatuses = new Set(["paid", "fulfilled", "shipped", "delivered"]);
  const cancelledOrders = orders.filter((o) => o["status"] === "cancelled").length;
  const totalSpend = orders.filter((o) => paidStatuses.has(o["status"] as string)).reduce((s, o) => s + ((o["total"] as number) ?? 0), 0);
  const usedLinks = links.filter((l) => l["status"] === "used").length;
  const unusedLinks = links.filter((l) => l["status"] === "unused").length;
  const expiredLinks = links.filter((l) => l["status"] === "expired").length;
  const totalCredits = links.reduce((s, l) => s + ((l["credit_amount"] as number) ?? 0), 0);
  const unusedCreditValue = links.filter((l) => l["status"] === "unused").reduce((s, l) => s + ((l["credit_amount"] as number) ?? 0), 0);

  const productTotals = new Map<string, { quantity: number }>();
  for (const order of orders.slice(0, 100)) {
    try {
      const items = await db.table("order_items").query({ order_id: order["id"] as string }, 1, 50);
      for (const item of items.data ?? []) {
        const pid = item["product_id"] as string;
        productTotals.set(pid, { quantity: (productTotals.get(pid)?.quantity ?? 0) + ((item["quantity"] as number) ?? 1) });
      }
    } catch { /* skip */ }
  }

  const top5 = Array.from(productTotals.entries()).sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 5);
  const resolvedProducts = await Promise.all(top5.map(async ([pid, data]) => {
    try { const p = await db.table("products").get(pid); return { name: (p["name"] as string) ?? pid, quantity: data.quantity }; }
    catch { return { name: pid, quantity: data.quantity }; }
  }));

  return {
    orders: { total: orders.length, cancelled: cancelledOrders, cancellation_rate: orders.length > 0 ? cancelledOrders / orders.length : 0, total_spend_usd: totalSpend },
    redemption_links: { total: links.length, used: usedLinks, unused: unusedLinks, expired: expiredLinks, redemption_rate: links.length > 0 ? usedLinks / links.length : 0, total_credit_issued_usd: totalCredits, unused_credit_value_usd: unusedCreditValue },
    top_products: resolvedProducts,
    budgets: budgets.map((b) => ({ name: b["name"], scope: b["scope"], limit: b["limit_amount"], spent: b["spent_amount"], pct_used: (b["limit_amount"] as number) > 0 ? (((b["spent_amount"] as number) ?? 0) / (b["limit_amount"] as number)) * 100 : 0 })),
    vendors: vendors.map((v) => ({ name: v["name"], quality_score: v["quality_score"], avg_turnaround_days: v["average_turnaround_days"], capabilities: v["capabilities"] })),
  };
}
