// ---------------------------------------------------------------------------
// Store Checkout Page (Story 6.1, Issue #22)
// Route: /store/[companySlug]/checkout
// ---------------------------------------------------------------------------
// Shows order summary with line items and a "Pay with Stripe" button.
// Cart state is read from sessionStorage (set by the cart page).
// ---------------------------------------------------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutCartItem } from "@/app/actions/checkout";

interface CheckoutPageProps {
  params: { companySlug: string };
}

interface CartState {
  companyId: string;
  userId: string;
  items: CheckoutCartItem[];
  taxRate?: number;
  shippingAmount?: number;
  campaignId?: string;
  recipientId?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { companySlug } = params;
  const router = useRouter();

  const [cart, setCart] = useState<CartState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`zeromerch_cart_${companySlug}`);
    if (stored) {
      try {
        setCart(JSON.parse(stored) as CartState);
      } catch {
        setError("Could not read cart. Please return to the store and try again.");
      }
    }
  }, [companySlug]);

  const subtotal =
    cart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0;
  const taxRate = cart?.taxRate ?? 0;
  const shippingAmount = cart?.shippingAmount ?? 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shippingAmount;

  async function handleCheckout() {
    if (!cart) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: cart.companyId,
          companySlug,
          cartItems: cart.items,
          userId: cart.userId,
          campaignId: cart.campaignId,
          recipientId: cart.recipientId,
          taxRate: cart.taxRate,
          shippingAmount: cart.shippingAmount,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed. Please try again.");
      }

      // Redirect to Stripe-hosted checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    }
  }

  if (!cart) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-center">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">
            Your cart is empty.{" "}
            <a href={`/store/${companySlug}`} className="underline">
              Browse products
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Checkout</h1>

      {/* Order summary */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>

        <ul className="divide-y divide-border">
          {cart.items.map((item, idx) => (
            <li key={`${item.variantId}-${idx}`} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.customization?.placement && (
                  <p className="text-sm text-muted-foreground">
                    Placement: {item.customization.placement}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {shippingAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{formatCurrency(shippingAmount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
          disabled={isLoading}
        >
          Back to Cart
        </button>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Redirecting to Stripe..." : "Pay with Stripe"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Secure payment powered by Stripe. Your card details are never stored by ZeroMerch.
      </p>
    </div>
  );
}
