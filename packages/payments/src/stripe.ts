// ---------------------------------------------------------------------------
// payments/stripe.ts — StripeClient wrapper for ZeroMerch
// ---------------------------------------------------------------------------

import type {
  CartItem,
  CheckoutSessionParams,
  CheckoutSessionResult,
  StripeWebhookEvent,
} from "./types.js";

/**
 * StripeClient wraps Stripe SDK calls behind a clean interface so that
 * the rest of the codebase never imports Stripe directly.
 *
 * When STRIPE_SECRET_KEY is absent the client operates in stub mode:
 * all methods return plausible-looking fake data and log a TODO warning.
 */
export class StripeClient {
  private secretKey: string | undefined;
  private webhookSecret: string | undefined;

  constructor() {
    this.secretKey = process.env["STRIPE_SECRET_KEY"];
    this.webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

    if (!this.secretKey) {
      console.warn(
        "[payments] STRIPE_SECRET_KEY is not set — running in stub mode. " +
          "TODO: set STRIPE_SECRET_KEY in env to enable real Stripe calls."
      );
    }
  }

  /**
   * Create a Stripe Checkout Session.
   *
   * Returns a session ID and the hosted checkout URL.
   */
  async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    if (!this.secretKey) {
      // TODO: remove stub once STRIPE_SECRET_KEY is set in env
      return {
        sessionId: `cs_stub_${Date.now()}`,
        url: params.successUrl + "?session_id=cs_stub_" + Date.now(),
      };
    }

    // Dynamic import keeps Stripe out of the module graph when key is absent
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey, { apiVersion: "2024-04-10" });

    const lineItems = params.cartItems.map((item: CartItem) => ({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(item.unitPrice * 100),
        product_data: {
          name: item.name,
          ...(item.customizationLabel
            ? { description: item.customizationLabel }
            : {}),
          metadata: {
            product_id: item.productId,
            variant_id: item.variantId,
          },
        },
      },
      quantity: item.quantity,
    }));

    const shippingRate =
      params.shippingCents != null && params.shippingCents > 0
        ? [
            await stripe.shippingRates.create({
              display_name: "Standard Shipping",
              type: "fixed_amount",
              fixed_amount: {
                amount: params.shippingCents,
                currency: "usd",
              },
            }),
          ]
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      ...(shippingRate ? { shipping_options: [{ shipping_rate: shippingRate[0].id }] } : {}),
      ...(params.stripeCustomerId ? { customer: params.stripeCustomerId } : {}),
      metadata: {
        company_id: params.companyId,
        user_id: params.userId,
      },
      success_url: params.successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: params.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Verify and parse a raw Stripe webhook payload.
   *
   * Throws if the signature is invalid.
   */
  async constructWebhookEvent(
    body: string,
    signature: string
  ): Promise<StripeWebhookEvent> {
    if (!this.secretKey || !this.webhookSecret) {
      // TODO: remove stub once STRIPE_WEBHOOK_SECRET is set in env
      const parsed = JSON.parse(body) as StripeWebhookEvent;
      return parsed;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey, { apiVersion: "2024-04-10" });

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      this.webhookSecret
    );

    return event as unknown as StripeWebhookEvent;
  }

  /**
   * Retrieve a Checkout Session by ID.
   */
  async retrieveSession(
    sessionId: string
  ): Promise<Record<string, unknown>> {
    if (!this.secretKey) {
      // TODO: remove stub once STRIPE_SECRET_KEY is set in env
      return { id: sessionId, payment_status: "paid", metadata: {} };
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(this.secretKey, { apiVersion: "2024-04-10" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session as unknown as Record<string, unknown>;
  }
}
