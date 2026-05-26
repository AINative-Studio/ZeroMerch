"use client";

// ---------------------------------------------------------------------------
// Dashboard — Brand Asset Upload (Story 3.1, Issue #10)
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { uploadBrandAsset, getBrandAssets } from "@/app/actions/brand";
import { getBrandKit } from "@/app/actions/brand";
import type { DesignAsset } from "@/app/actions/brand";

const ASSET_TYPES = [
  { value: "logo", label: "Logo" },
  { value: "icon", label: "Icon" },
  { value: "pattern", label: "Pattern" },
  { value: "mockup", label: "Mockup" },
  { value: "print_file", label: "Print File" },
] as const;

type AssetType = (typeof ASSET_TYPES)[number]["value"];

function AssetCard({ asset }: { asset: DesignAsset }) {
  const isSvg = asset.metadata.format === "svg";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden group">
      {/* Preview area */}
      <div className="aspect-square bg-muted flex items-center justify-center relative">
        {asset.file_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.file_url}
            alt={asset.metadata.original_name}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileIcon className="h-8 w-8" />
            <span className="text-xs font-mono uppercase">{asset.metadata.format}</span>
          </div>
        )}

        {/* Format badge */}
        <span className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-mono uppercase border border-border">
          {isSvg ? "SVG" : "PNG"}
        </span>
      </div>

      {/* Metadata */}
      <div className="p-3 space-y-1">
        <p
          className="text-sm font-medium truncate"
          title={asset.metadata.original_name}
        >
          {asset.metadata.original_name}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
              asset.usage_status === "approved"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : asset.usage_status === "rejected"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {asset.usage_status}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {asset.asset_type}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatBytes(asset.metadata.size_bytes)}
        </p>
      </div>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BrandAssetsPage() {
  const { companyId } = useAuth();
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedType, setSelectedType] = useState<AssetType>("logo");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    Promise.all([
      getBrandKit(companyId),
    ]).then(([kit]) => {
      if (kit) {
        setBrandKitId(kit.id);
        getBrandAssets(kit.id, companyId).then((result) => {
          if ("assets" in result) setAssets(result.assets);
          else setError(result.error);
        });
      }
      setIsLoading(false);
    });
  }, [companyId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!brandKitId || !companyId) {
      setUploadError("Brand kit not found. Please set up your company workspace first.");
      return;
    }

    setUploadError(null);
    const file = files[0];

    startTransition(async () => {
      const result = await uploadBrandAsset(file, brandKitId, companyId, selectedType);
      if ("error" in result) {
        setUploadError(result.error);
        return;
      }
      setAssets((prev) => [result.asset, ...prev]);
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Assets</h1>
        <p className="text-muted-foreground">
          Upload SVG and PNG files to your brand library.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Upload area */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Upload new asset</h2>

        {/* Asset type selector */}
        <div className="space-y-2">
          <label htmlFor="assetType" className="text-sm font-medium">
            Asset type
          </label>
          <select
            id="assetType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AssetType)}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Upload brand asset — click or drag and drop"
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
          }`}
        >
          <UploadIcon className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {isPending ? "Uploading..." : "Click or drag to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              SVG or PNG — max 10 MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,image/png"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={isPending}
            aria-hidden="true"
          />
        </div>

        {uploadError && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* Asset grid */}
      <div>
        <h2 className="text-sm font-semibold mb-4">
          {assets.length > 0
            ? `${assets.length} asset${assets.length !== 1 ? "s" : ""}`
            : "No assets yet"}
        </h2>

        {assets.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <FileIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Upload your first brand asset above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
