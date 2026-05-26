// ---------------------------------------------------------------------------
// payments/types.ts — Stripe checkout and webhook types for ZeroMerch
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Optional customization label shown in Stripe line items */
  customizationLabel?: string;
}

export interface CheckoutSessionParams {
  companyId: string;
  companySlug: string;
  userId: string;
  cartItems: CartItem[];
  /** Tax amount in cents */
  taxCents?: number;
  /** Shipping amount in cents */
  shippingCents?: number;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect on cancel */
  cancelUrl: string;
  /** Stripe customer ID if known */
  stripeCustomerId?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface CheckoutSessionCompleted {
  id: string;
  payment_status: string;
  metadata: Record<string, string>;
  amount_total: number | null;
  amount_subtotal: number | null;
  shipping_cost?: {
    amount_total: number;
  };
}
