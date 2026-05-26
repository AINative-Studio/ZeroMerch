"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Company, BrandKit, Product } from "@zeromerch/zerodb";

interface StorefrontClientProps {
  company: Company;
  brandKit: BrandKit | null;
  products: Product[];
  categories: string[];
  initialCategory: string | null;
}

function categoryLabel(cat: string): string {
  return cat.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function StorefrontClient({ company, brandKit, products, categories, initialCategory }: StorefrontClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const primaryColor = brandKit?.primary_colors?.[0] ?? "hsl(var(--primary))";

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4">
        <div className="overflow-hidden rounded-xl border border-border p-8"
          style={{ background: `linear-gradient(135deg, ${primaryColor}18 0%, transparent 60%)`, borderColor: `${primaryColor}30` }}>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{company.name} Store</h1>
          <p className="mt-2 text-muted-foreground">Official branded merchandise</p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:hidden">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..." aria-label="Search products"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container mx-auto px-4" aria-label="Category filters">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
            {["", ...categories].map((cat) => {
              const isAll = cat === "";
              const active = isAll ? activeCategory === null : activeCategory === cat;
              return (
                <button key={cat || "all"} role="tab" aria-selected={active}
                  onClick={() => setActiveCategory(isAll ? null : (activeCategory === cat ? null : cat))}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"}`}
                  style={active ? { backgroundColor: primaryColor, color: "#fff" } : undefined}>
                  {isAll ? "All" : categoryLabel(cat)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4" aria-label="Products">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? `No products found for "${searchQuery}"` : "No products available."}
            </p>
            {(searchQuery || activeCategory) && (
              <button type="button" onClick={() => { setSearchQuery(""); setActiveCategory(null); }}
                className="mt-3 text-sm font-medium text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
              {activeCategory ? ` in ${categoryLabel(activeCategory)}` : ""}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Product grid">
              {filteredProducts.map((product) => (
                <article key={product.id} role="listitem"
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
                  <Link href={`/store/${company.slug}/products/${product.id}`} className="block overflow-hidden aspect-square w-full bg-muted" tabIndex={-1} aria-hidden="true">
                    <div className="flex h-full items-center justify-center text-muted-foreground transition-transform duration-300 group-hover:scale-105">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {product.category && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{categoryLabel(product.category)}</span>}
                    <Link href={`/store/${company.slug}/products/${product.id}`}
                      className="text-base font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {product.name}
                    </Link>
                    {product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-foreground">{formatCurrency(product.base_price, product.currency)}</span>
                      <Link href={`/store/${company.slug}/products/${product.id}`}
                        className="rounded-md px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ backgroundColor: primaryColor }} aria-label={`View ${product.name}`}>
                        View
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
