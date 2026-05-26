"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { CartDrawer } from "@zeromerch/ui";
import type { Company, BrandKit } from "@zeromerch/zerodb";

interface StorefrontBrandBannerProps { companySlug: string; }
interface StorefrontBranding { company: Company | null; brandKit: BrandKit | null; }

async function fetchBranding(slug: string): Promise<StorefrontBranding> {
  try {
    const res = await fetch(`/api/store/${slug}/branding`);
    if (!res.ok) return { company: null, brandKit: null };
    return res.json() as Promise<StorefrontBranding>;
  } catch { return { company: null, brandKit: null }; }
}

export function StorefrontBrandBanner({ companySlug }: StorefrontBrandBannerProps) {
  const [branding, setBranding] = useState<StorefrontBranding>({ company: null, brandKit: null });
  const [cartOpen, setCartOpen] = useState(false);
  const companyId = branding.company?.id ?? companySlug;
  const cart = useCart(companyId);

  useEffect(() => { fetchBranding(companySlug).then(setBranding); }, [companySlug]);

  const primaryColor = branding.brandKit?.primary_colors?.[0] ?? undefined;

  if (!branding.company) {
    return <div className="h-10 w-full border-b border-border bg-muted/40 animate-pulse" aria-hidden="true" />;
  }

  return (
    <>
      <div className="w-full border-b px-4 py-2"
        style={{ borderBottomColor: primaryColor ? `${primaryColor}40` : undefined, backgroundColor: primaryColor ? `${primaryColor}0d` : undefined }}>
        <div className="container mx-auto flex items-center justify-between gap-4">
          <Link href={`/store/${companySlug}`} className="flex shrink-0 items-center gap-2" aria-label={`${branding.company.name} store home`}>
            <span className="text-sm font-semibold text-foreground" style={primaryColor ? { color: primaryColor } : undefined}>
              {branding.company.name}
            </span>
            <span className="text-xs text-muted-foreground">Official Store</span>
          </Link>
          <button type="button" aria-label={`Open cart — ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`}
            onClick={() => setCartOpen(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cart.itemCount > 0 && (
              <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: primaryColor ?? "hsl(var(--primary))" }}>
                {cart.itemCount > 99 ? "99+" : cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)}
        items={cart.items} total={cart.total} companySlug={companySlug}
        onUpdateQuantity={cart.updateQuantity} onRemoveItem={cart.removeItem} />
    </>
  );
}
