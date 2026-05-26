// ---------------------------------------------------------------------------
// Recipient Profile — Story 10.3, Issue #40
// Purchase history, inferred preferences, personalized recommendations
// ---------------------------------------------------------------------------

import { Suspense } from "react";
import { getSession } from "@zeromerch/auth";
import { redirect, notFound } from "next/navigation";
import { ZeroDBClient } from "@zeromerch/zerodb";
import { inferPreferences, getPersonalizedRecommendations } from "@/app/actions/preferences";
import type { RecipientPreferences, ProductRecommendation } from "@/app/actions/preferences";
import type { Recipient, Order, OrderItem, Product, ProductVariant } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

export const metadata = {
  title: "Recipient Profile",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colorSwatch(color: string) {
  const namedColors: Record<string, string> = {
    black: "#111827",
    white: "#f9fafb",
    navy: "#1e3a5f",
    grey: "#6b7280",
    gray: "#6b7280",
    green: "#059669",
    blue: "#2563eb",
    red: "#dc2626",
  };
  return namedColors[color.toLowerCase()] ?? "#6b7280";
}

// ─── Purchase history section ─────────────────────────────────────────────────

async function PurchaseHistory({
  recipientId,
  companyId,
}: {
  recipientId: string;
  companyId: string;
}) {
  const ordersResult = await db
    .table("orders")
    .query({ recipient_id: recipientId, company_id: companyId }, 1, 20);

  const orders = ordersResult.data ?? [];

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No purchase history yet.</p>
    );
  }

  // Fetch order items for each order
  const itemResults = await Promise.all(
    orders.map((o: Order) =>
      db.table("order_items").query({ order_id: o.id }, 1, 10)
    )
  );

  const orderItems = itemResults.map((r, i) => ({
    order: orders[i]!,
    items: r.data ?? [] as OrderItem[],
  }));

  // Fetch unique products
  const productIds = [...new Set(orderItems.flatMap(({ items }) => items.map((i) => i.product_id)))];
  const variantIds = [...new Set(orderItems.flatMap(({ items }) => items.map((i) => i.variant_id)))];

  const [products, variants] = await Promise.all([
    Promise.all(productIds.map((id) => db.table("products").get(id).catch(() => null))),
    Promise.all(variantIds.map((id) => db.table("product_variants").get(id).catch(() => null))),
  ]);

  const productMap = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));
  const variantMap = new Map(variants.filter(Boolean).map((v) => [v!.id, v!]));

  return (
    <div className="flex flex-col gap-3">
      {orderItems.map(({ order, items }) => (
        <div key={order.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Order
              </p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                order.status === "delivered"
                  ? "bg-green-100 text-green-800"
                  : order.status === "shipped"
                  ? "bg-blue-100 text-blue-800"
                  : order.status === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}>
                {order.status}
              </span>
              <p className="text-xs font-semibold text-foreground">
                ${order.total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {items.map((item: OrderItem) => {
                const product = productMap.get(item.product_id) as Product | undefined;
                const variant = variantMap.get(item.variant_id) as ProductVariant | undefined;
                return (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">
                      {product?.name ?? "Product"}{" "}
                      {variant && (
                        <span className="text-muted-foreground">
                          ({[variant.color, variant.size].filter(Boolean).join(" / ")})
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      x{item.quantity} · ${item.unit_price.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Inferred preferences section ────────────────────────────────────────────

async function InferredPreferences({
  recipientId,
  companyId,
}: {
  recipientId: string;
  companyId: string;
}) {
  const [inferResult, prefsResult] = await Promise.all([
    inferPreferences(recipientId, companyId),
    db
      .table("recipient_preferences" as never)
      .query({ recipient_id: recipientId } as never, 1, 1)
      .then((r: { data?: RecipientPreferences[] }) => (r.data ?? [])[0] ?? null)
      .catch(() => null),
  ]);

  const prefs = prefsResult as RecipientPreferences | null;

  if ("error" in inferResult) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load preferences: {inferResult.error}
      </p>
    );
  }

  const { profile } = inferResult;

  return (
    <div className="flex flex-col gap-4">
      {/* Sizes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Shirt Size", value: prefs?.shirt_size ?? profile.inferred_shirt_size },
          { label: "Hoodie Size", value: prefs?.hoodie_size ?? profile.inferred_hoodie_size },
          { label: "Orders", value: profile.purchase_count },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Preferred colors */}
      {(prefs?.preferred_colors?.length || profile.inferred_colors.length) > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preferred Colors
          </p>
          <div className="flex flex-wrap gap-2">
            {(prefs?.preferred_colors ?? profile.inferred_colors).map((c) => (
              <div key={c} className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
                <span
                  className="h-3 w-3 rounded-full border border-border/50"
                  style={{ backgroundColor: colorSwatch(c) }}
                />
                <span className="text-xs font-medium capitalize">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top categories */}
      {profile.favorite_categories.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Favorite Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.favorite_categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-foreground/80"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recommendations grid ────────────────────────────────────────────────────

async function RecommendationsGrid({
  recipientId,
  companyId,
}: {
  recipientId: string;
  companyId: string;
}) {
  const result = await getPersonalizedRecommendations(recipientId, companyId, 6);

  if ("error" in result) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load recommendations: {result.error}
      </p>
    );
  }

  if (result.recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recommendations available yet. Purchase history helps improve suggestions.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {result.recommendations.map((rec: ProductRecommendation) => (
        <div
          key={rec.product.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-snug text-foreground">
              {rec.product.name}
            </h4>
            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(rec.similarity_score * 100)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{rec.product.description}</p>
          <p className="text-xs italic text-muted-foreground">{rec.reason}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              ${rec.product.base_price.toFixed(2)}
            </span>
            <a
              href={`/dashboard/products/${rec.product.id}`}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              View
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function RecipientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const companyId = session.user.company_id;
  const { id: recipientId } = params;

  let recipient: Recipient;
  try {
    recipient = await db.table("recipients").get(recipientId);
  } catch {
    notFound();
  }

  if (recipient.company_id !== companyId) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{recipient.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {recipient.email}
            {recipient.type && (
              <>
                {" · "}
                <span className="capitalize">{recipient.type.replace("_", " ")}</span>
              </>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            recipient.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {recipient.status}
        </span>
      </div>

      {/* Purchase history */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Purchase History</h2>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading purchase history...
            </div>
          }
        >
          <PurchaseHistory recipientId={recipientId} companyId={companyId} />
        </Suspense>
      </section>

      <hr className="border-border" />

      {/* Inferred preferences */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Inferred Preferences</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            AI-powered
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Synthesized from purchase history and agent memory.
        </p>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Inferring preferences...
            </div>
          }
        >
          <InferredPreferences recipientId={recipientId} companyId={companyId} />
        </Suspense>
      </section>

      <hr className="border-border" />

      {/* Personalized recommendations */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Personalized Recommendations</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Vector-ranked
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Products matched to this recipient&apos;s size and color preferences, excluding items they&apos;ve already received.
        </p>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating recommendations...
            </div>
          }
        >
          <RecommendationsGrid recipientId={recipientId} companyId={companyId} />
        </Suspense>
      </section>
    </div>
  );
}
