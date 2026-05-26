"use client";

// ---------------------------------------------------------------------------
// RedeemForm — shipping address collection + gift claim submission
// Used by: /redeem/[token]/page.tsx
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import { claimGift } from "@/app/actions/redemption";
import type { ShippingAddress } from "@/app/actions/redemption";

interface RedeemFormProps {
  token: string;
  creditAmount: number;
}

type FieldErrors = Partial<Record<keyof ShippingAddress, string>>;

function validateAddress(data: Partial<ShippingAddress>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.name?.trim()) errors.name = "Full name is required";
  if (!data.line1?.trim()) errors.line1 = "Address line 1 is required";
  if (!data.city?.trim()) errors.city = "City is required";
  if (!data.state?.trim()) errors.state = "State / province is required";
  if (!data.postalCode?.trim()) errors.postalCode = "Postal code is required";
  if (!data.country?.trim()) errors.country = "Country is required";
  return errors;
}

export default function RedeemForm({ token, creditAmount }: RedeemFormProps) {
  const [form, setForm] = useState<Partial<ShippingAddress>>({
    country: "US",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof ShippingAddress]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateAddress(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await claimGift(token, form as ShippingAddress);
        setOrderId(result.orderId);
        setSuccess(true);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to claim gift. Please try again."
        );
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 text-xl font-semibold">Gift claimed!</h2>
        <p className="text-muted-foreground">
          Your merch is on its way. You will receive a confirmation email with
          tracking information.
        </p>
        {orderId && (
          <p className="mt-3 text-xs text-muted-foreground">
            Order ID:{" "}
            <span className="font-mono">{orderId}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      <h2 className="mb-5 text-lg font-semibold">Shipping Address</h2>

      <div className="space-y-4">
        {/* Full name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Full name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name ?? ""}
            onChange={handleChange}
            disabled={isPending}
            placeholder="Jane Smith"
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
              fieldErrors.name ? "border-destructive" : "border-border"
            }`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        {/* Address line 1 */}
        <div>
          <label
            htmlFor="line1"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Address <span className="text-destructive">*</span>
          </label>
          <input
            id="line1"
            name="line1"
            type="text"
            autoComplete="address-line1"
            value={form.line1 ?? ""}
            onChange={handleChange}
            disabled={isPending}
            placeholder="123 Main St"
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
              fieldErrors.line1 ? "border-destructive" : "border-border"
            }`}
          />
          {fieldErrors.line1 && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.line1}</p>
          )}
        </div>

        {/* Address line 2 */}
        <div>
          <label
            htmlFor="line2"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Apartment, suite, etc.{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="line2"
            name="line2"
            type="text"
            autoComplete="address-line2"
            value={form.line2 ?? ""}
            onChange={handleChange}
            disabled={isPending}
            placeholder="Suite 400"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* City + State */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="city"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              City <span className="text-destructive">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              value={form.city ?? ""}
              onChange={handleChange}
              disabled={isPending}
              placeholder="San Francisco"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                fieldErrors.city ? "border-destructive" : "border-border"
              }`}
            />
            {fieldErrors.city && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.city}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="state"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              State <span className="text-destructive">*</span>
            </label>
            <input
              id="state"
              name="state"
              type="text"
              autoComplete="address-level1"
              value={form.state ?? ""}
              onChange={handleChange}
              disabled={isPending}
              placeholder="CA"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                fieldErrors.state ? "border-destructive" : "border-border"
              }`}
            />
            {fieldErrors.state && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.state}</p>
            )}
          </div>
        </div>

        {/* Postal code + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="postalCode"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Postal code <span className="text-destructive">*</span>
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              autoComplete="postal-code"
              value={form.postalCode ?? ""}
              onChange={handleChange}
              disabled={isPending}
              placeholder="94105"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                fieldErrors.postalCode ? "border-destructive" : "border-border"
              }`}
            />
            {fieldErrors.postalCode && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.postalCode}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="country"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Country <span className="text-destructive">*</span>
            </label>
            <select
              id="country"
              name="country"
              autoComplete="country"
              value={form.country ?? "US"}
              onChange={handleChange}
              disabled={isPending}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                fieldErrors.country ? "border-destructive" : "border-border"
              }`}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="NL">Netherlands</option>
              <option value="SE">Sweden</option>
              <option value="JP">Japan</option>
              <option value="SG">Singapore</option>
              <option value="OTHER">Other</option>
            </select>
            {fieldErrors.country && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.country}</p>
            )}
          </div>
        </div>
      </div>

      {submitError && (
        <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending
          ? "Claiming your gift..."
          : `Claim Gift (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(creditAmount)})`}
      </button>
    </form>
  );
}
