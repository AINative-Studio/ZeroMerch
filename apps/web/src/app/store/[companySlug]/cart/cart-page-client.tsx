"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import { useCart } from "@/hooks/use-cart";
import type { Budget } from "@zeromerch/zerodb";

interface Props { companySlug: string; }

function fmt(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

async function fetchCompanyId(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/store/${slug}/branding`);
    if (!res.ok) return null;
    const data = (await res.json()) as { company?: { id: string } };
    return data.company?.id ?? null;
  } catch { return null; }
}

async function fetchBudget(slug: string): Promise<Budget | null> {
  try {
    const res = await fetch(`/api/store/${slug}/budget`, { credentials: "include" });
    if (!res.ok) return null;
    return res.json() as Promise<Budget>;
  } catch { return null; }
}

export function CartPageClient({ companySlug }: Props) {
  const { isAuthenticated } = useAuth();
  const [companyId, setCompanyId] = useState<string>(companySlug);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const cart = useCart(companyId);

  useEffect(() => { fetchCompanyId(companySlug).then((id) => { if (id) setCompanyId(id); }); }, [companySlug]);
  useEffect(() => {
    if (isAuthenticated) { setBudgetLoading(true); fetchBudget(companySlug).then(setBudget).finally(() => setBudgetLoading(false)); }
  }, [isAuthenticated, companySlug]);

  const budgetRemaining = budget ? budget.limit_amount - budget.spent_amount : null;
  const isOverBudget = budgetRemaining !== null && cart.total > budgetRemaining;

  return (
    <div className="container mx-auto px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link href={`/store/${companySlug}`} className="hover:text-foreground">Store</Link></li>
          <li aria-hidden="true">/</li><li className="text-foreground">Cart</li>
        </ol>
      </nav>
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Shopping Cart</h1>
      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-5 text-muted-foreground" aria-hidden="true">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <p className="mb-2 text-lg font-medium text-foreground">Your cart is empty</p>
          <p className="mb-6 text-sm text-muted-foreground">Add some products to get started.</p>
          <Link href={`/store/${companySlug}`} className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Browse Store</Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Cart items">
              {cart.items.map((item) => (
                <li key={item.variant_id} className="flex gap-4 p-4 sm:p-5">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                      : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{item.variant_label}</p>
                      </div>
                      <p className="shrink-0 text-base font-semibold text-foreground">{fmt(item.unit_price * item.quantity)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center rounded-md border border-border" role="group" aria-label={`Quantity for ${item.product_name}`}>
                        <button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => cart.updateQuantity(item.variant_id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span className="flex h-8 w-9 items-center justify-center border-x border-border text-sm font-medium">{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => cart.updateQuantity(item.variant_id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmt(item.unit_price)} each</span>
                      <button type="button" aria-label={`Remove ${item.product_name}`} onClick={() => cart.removeItem(item.variant_id)}
                        className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between">
              <Link href={`/store/${companySlug}`} className="text-sm font-medium text-primary hover:underline">Continue shopping</Link>
              <button type="button" onClick={cart.clear} className="text-sm text-muted-foreground hover:text-destructive hover:underline underline-offset-2">Clear cart</button>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-20">
              <h2 className="text-base font-semibold text-foreground">Order Summary</h2>
              <ul className="space-y-2 text-sm">
                {cart.items.map((item) => (
                  <li key={item.variant_id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-muted-foreground">{item.product_name} <span className="text-xs">x{item.quantity}</span></span>
                    <span className="shrink-0 font-medium text-foreground">{fmt(item.unit_price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between text-base font-semibold text-foreground">
                  <span>Subtotal</span><span>{fmt(cart.total)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
              </div>
              {isAuthenticated && (
                <div className={`rounded-lg border px-3 py-2.5 text-sm ${budgetLoading ? "border-border text-muted-foreground" : isOverBudget ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-green-500/30 bg-green-500/10 text-green-400"}`} role="status" aria-live="polite">
                  {budgetLoading ? <span>Loading budget...</span> : budgetRemaining !== null ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between"><span>Budget remaining</span><span className="font-semibold">{fmt(budgetRemaining)}</span></div>
                      <div className="flex items-center justify-between"><span>Cart total</span><span className="font-semibold">{fmt(cart.total)}</span></div>
                      {isOverBudget && <p className="mt-1 text-xs font-medium">Exceeds budget by {fmt(cart.total - budgetRemaining)}</p>}
                    </div>
                  ) : <span>No budget assigned</span>}
                </div>
              )}
              <Link href={`/store/${companySlug}/checkout`}
                className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Proceed to Checkout
              </Link>
              <p className="text-center text-xs text-muted-foreground">Secure checkout powered by ZeroMerch</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
