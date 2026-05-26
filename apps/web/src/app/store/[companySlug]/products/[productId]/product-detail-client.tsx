"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import { VariantSelector } from "@zeromerch/ui";
import { useCart } from "@/hooks/use-cart";
import type { Company, BrandKit, Product, ProductVariant, Budget } from "@zeromerch/zerodb";

interface Props { company: Company; brandKit: BrandKit | null; product: Product; variants: ProductVariant[]; }

function fmt(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

async function fetchBudget(companySlug: string): Promise<Budget | null> {
  try {
    const res = await fetch(`/api/store/${companySlug}/budget`, { credentials: "include" });
    if (!res.ok) return null;
    return res.json() as Promise<Budget>;
  } catch { return null; }
}

export function ProductDetailClient({ company, brandKit, product, variants }: Props) {
  const { isAuthenticated, companyId: authCompanyId } = useAuth();
  const cart = useCart(company.id);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => variants.find((v) => v.status === "active" && v.inventory_count > 0)?.id ?? null
  );
  const [budget, setBudget] = useState<Budget | null>(null);
  const [added, setAdded] = useState(false);
  const primaryColor = brandKit?.primary_colors?.[0] ?? "hsl(var(--primary))";
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  useEffect(() => {
    if (isAuthenticated && authCompanyId === company.id) {
      fetchBudget(company.slug).then(setBudget);
    }
  }, [isAuthenticated, authCompanyId, company.id, company.slug]);

  const budgetRemaining = budget ? budget.limit_amount - budget.spent_amount : null;
  const isOverBudget = budgetRemaining !== null && cart.total > budgetRemaining;
  const canAddToCart = selectedVariant !== null && selectedVariant.inventory_count > 0 && selectedVariant.status !== "out_of_stock";

  function handleAddToCart() {
    if (!selectedVariant) return;
    const variantLabel = [selectedVariant.color, selectedVariant.size].filter(Boolean).join(" / ");
    cart.addItem({ product_id: product.id, variant_id: selectedVariant.id, product_name: product.name, variant_label: variantLabel || selectedVariant.sku, unit_price: selectedVariant.price, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link href={`/store/${company.slug}`} className="hover:text-foreground">{company.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{product.name}</li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground">
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <div className="flex flex-col gap-5">
          {product.category && <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{product.category}</span>}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{product.name}</h1>
          <span className="text-3xl font-bold text-foreground">{selectedVariant ? fmt(selectedVariant.price, product.currency) : fmt(product.base_price, product.currency)}</span>
          {product.description && <p className="text-base text-muted-foreground leading-relaxed">{product.description}</p>}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">{tag}</span>)}
            </div>
          )}
          {variants.length > 0 && (
            <div className="border-t border-border pt-5">
              <VariantSelector variants={variants} selectedVariantId={selectedVariantId} onSelect={(v) => setSelectedVariantId(v.id)} />
            </div>
          )}
          {isAuthenticated && authCompanyId === company.id && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${isOverBudget ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-green-500/30 bg-green-500/10 text-green-400"}`} role="status" aria-live="polite">
              {budgetRemaining !== null
                ? <><span className="font-medium">Budget remaining: </span>{fmt(budgetRemaining, product.currency)}{isOverBudget && <span className="ml-2">— Cart ({fmt(cart.total, product.currency)}) exceeds budget</span>}</>
                : <span className="text-muted-foreground">Loading budget...</span>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleAddToCart} disabled={!canAddToCart}
              className="flex-1 rounded-md py-2.5 px-6 text-sm font-semibold text-white shadow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: added ? "#22c55e" : primaryColor }}>
              {added ? "Added to Cart!" : !canAddToCart ? "Out of Stock" : "Add to Cart"}
            </button>
            <Link href={`/store/${company.slug}/cart`}
              className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View Cart{cart.itemCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{cart.itemCount}</span>}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
