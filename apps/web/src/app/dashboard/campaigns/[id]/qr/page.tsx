"use client";

// ---------------------------------------------------------------------------
// QR Code Display — Event Drop organizer view (Story 7.2, Issue #27)
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useTransition } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@zeromerch/auth";
import { getCampaign, generateQRCode } from "@/app/actions/campaigns";
import type { CampaignWithProducts } from "@/app/actions/campaigns";
import Link from "next/link";

export default function CampaignQRPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<CampaignWithProducts | null>(null);
  const [landingUrl, setLandingUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrRendered, setQrRendered] = useState(false);
  const [, startTransition] = useTransition();
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campaignId) return;

    startTransition(async () => {
      const [campaignResult, qrResult] = await Promise.all([
        getCampaign(campaignId),
        generateQRCode(campaignId),
      ]);

      if ("error" in campaignResult) {
        setError(campaignResult.error);
        setLoading(false);
        return;
      }
      if ("error" in qrResult) {
        setError(qrResult.error);
        setLoading(false);
        return;
      }

      setCampaign(campaignResult.campaign);
      setLandingUrl(qrResult.landingUrl);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // Render QR code SVG client-side using the qrcode package
  useEffect(() => {
    if (!landingUrl || !qrContainerRef.current || qrRendered) return;

    import("qrcode").then((QRCode) => {
      if (!qrContainerRef.current) return;
      QRCode.toString(landingUrl, { type: "svg", width: 280, margin: 2 }, (err, svg) => {
        if (err || !qrContainerRef.current) return;
        qrContainerRef.current.innerHTML = svg;
        setQrRendered(true);
      });
    });
  }, [landingUrl, qrRendered]);

  const handleCopyLink = async () => {
    if (!landingUrl) return;
    try {
      await navigator.clipboard.writeText(landingUrl);
    } catch {
      // Fallback: select text
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-sm text-muted-foreground">
        Loading campaign...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link
          href="/dashboard/campaigns"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (!campaign) return null;

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 print:max-w-none print:space-y-8">
      {/* Back link — hidden on print */}
      <Link
        href={`/dashboard/campaigns`}
        className="text-sm text-primary hover:underline print:hidden"
      >
        ← Back to campaigns
      </Link>

      {/* Campaign header */}
      <div>
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className="rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 px-2 py-0.5 text-xs font-medium">
            Event Drop
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              campaign.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {campaign.status}
          </span>
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-6">
        <div
          ref={qrContainerRef}
          className="w-[280px] h-[280px] flex items-center justify-center"
          aria-label={`QR code for ${campaign.name}`}
        >
          {!qrRendered && (
            <div className="text-sm text-muted-foreground">
              Generating QR code...
            </div>
          )}
        </div>

        <div className="w-full space-y-2">
          <p className="text-xs font-medium text-muted-foreground text-center">
            Share this URL or print the QR code
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
            <span className="flex-1 truncate text-xs font-mono">{landingUrl}</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 rounded px-2 py-0.5 text-xs bg-background hover:bg-muted/80 border border-border transition-colors print:hidden"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Campaign info */}
      <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
        <h2 className="text-sm font-semibold">Event Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Starts</dt>
          <dd>{formatDate(campaign.start_at)}</dd>
          <dt className="text-muted-foreground">Ends</dt>
          <dd>{formatDate(campaign.end_at)}</dd>
          <dt className="text-muted-foreground">Access</dt>
          <dd className="capitalize">
            {(campaign.access_mode ?? "public").replace("_", " ")}
          </dd>
          <dt className="text-muted-foreground">Products</dt>
          <dd>{campaign.products.length}</dd>
        </dl>
      </div>

      {/* Products included */}
      {campaign.products.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Included Products</h2>
          <ul className="space-y-2">
            {campaign.products.map((cp) => (
              <li key={cp.id} className="flex justify-between text-sm">
                <span>{cp.product?.name ?? cp.product_id}</span>
                <span className="text-muted-foreground">
                  Max {cp.max_quantity_per_recipient}/person
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Print QR Code
        </button>
        <Link
          href={landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Preview Landing Page
        </Link>
      </div>
    </div>
  );
}
