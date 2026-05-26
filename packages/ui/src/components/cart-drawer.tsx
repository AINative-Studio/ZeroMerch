"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface CartItem {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
}

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  companySlug: string;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function CartDrawer({ isOpen, onClose, items, total, companySlug, onUpdateQuantity, onRemoveItem }: CartDrawerProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <div aria-hidden="true"
        className={cn("fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300", isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Shopping cart"
        className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out", isOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Cart
            {items.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </h2>
          <button type="button" aria-label="Close cart" onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-muted-foreground" aria-hidden="true">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
              <button type="button" onClick={onClose} className="mt-4 text-sm font-medium text-primary hover:underline">Continue shopping</button>
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Cart items">
              {items.map((item) => (
                <li key={item.variant_id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_label}</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(item.unit_price * item.quantity)}</p>
                    <div className="mt-auto flex items-center gap-2">
                      <div className="flex items-center rounded-md border border-border">
                        <button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1}
                          onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span className="flex h-7 w-8 items-center justify-center border-x border-border text-xs font-medium">{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity"
                          onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                      <button type="button" aria-label={`Remove ${item.product_name}`}
                        onClick={() => onRemoveItem(item.variant_id)}
                        className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-base font-semibold text-foreground">{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
            <a href={`/store/${companySlug}/cart`} onClick={onClose}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View Cart &amp; Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
}
