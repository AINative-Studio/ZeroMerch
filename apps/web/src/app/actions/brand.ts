"use server";

// ---------------------------------------------------------------------------
// Server Actions — Brand Asset Upload (Story 3.1, Issue #10)
//                  Brand Rules Configuration (Story 3.2, Issue #11)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { BrandKit, DesignAsset } from "@zeromerch/zerodb";

export type { DesignAsset };

const db = new ZeroDBClient({
  projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec",
});

// ─── Validation ──────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set(["image/svg+xml", "image/png"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateUpload(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only SVG and PNG files are accepted");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be 10 MB or smaller");
  }
  if (!file.name) {
    throw new Error("File must have a name");
  }
}

// ─── File Upload ─────────────────────────────────────────────────────────────

async function uploadFileToZeroDB(
  file: File,
  projectId: string
): Promise<{ file_id: string; file_url: string }> {
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiUrl =
    process.env["ZERODB_API_URL"] ?? "https://api.ainative.studio";

  if (!apiToken) {
    throw new Error("ZERODB_API_TOKEN is not configured");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${apiUrl}/api/v1/projects/${projectId}/files/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`File upload failed (${response.status}): ${text}`);
  }

  const result = (await response.json()) as {
    file_id?: string;
    id?: string;
    url?: string;
    file_url?: string;
  };

  const file_id = result.file_id ?? result.id;
  const file_url = result.file_url ?? result.url ?? "";

  if (!file_id) {
    throw new Error("ZeroDB did not return a file_id for the upload");
  }

  return { file_id, file_url };
}

// ─── Brand Asset Actions ─────────────────────────────────────────────────────

/**
 * Upload a brand asset (SVG or PNG) to ZeroDB file storage
 * and create a `design_assets` record scoped to the brand kit.
 */
export async function uploadBrandAsset(
  file: File,
  brandKitId: string,
  companyId: string,
  assetType: DesignAsset["asset_type"] = "logo"
): Promise<{ asset: DesignAsset } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    validateUpload(file);

    const projectId =
      process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

    // Upload to ZeroDB file storage
    const { file_id, file_url } = await uploadFileToZeroDB(file, projectId);

    // Determine format from MIME type
    const format = file.type === "image/svg+xml" ? "svg" : "png";

    // Index in design_assets collection
    const assetsTable = db.table("design_assets");
    const asset = await assetsTable.insert({
      company_id: companyId,
      brand_kit_id: brandKitId,
      file_id,
      asset_type: assetType,
      usage_status: "pending" as const,
      metadata: {
        format,
        original_name: file.name,
        size_bytes: file.size,
      },
      file_url,
      created_by: session.user.id,
      created_at: new Date().toISOString(),
    });

    return { asset };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { error: message };
  }
}

/**
 * List all design assets for a given brand kit, scoped by company.
 */
export async function getBrandAssets(
  brandKitId: string,
  companyId: string
): Promise<{ assets: DesignAsset[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const assetsTable = db.table("design_assets");
    const result = await assetsTable.query(
      { brand_kit_id: brandKitId, company_id: companyId },
      1,
      100
    );
    return { assets: result.data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load assets";
    return { error: message };
  }
}

// ─── Brand Kit Actions ───────────────────────────────────────────────────────

export interface CreateBrandKitInput {
  name?: string;
  primary_colors?: string[];
  secondary_colors?: string[];
  fonts?: string[];
  approved_phrases?: string[];
  restricted_phrases?: string[];
  tone?: string;
  restricted_products?: string[];
}

/**
 * Create a brand kit for a company.
 */
export async function createBrandKit(
  companyId: string,
  data: CreateBrandKitInput = {}
): Promise<{ brandKit: BrandKit } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const brandKitsTable = db.table("brand_kits");
    const now = new Date().toISOString();
    const brandKit = await brandKitsTable.insert({
      company_id: companyId,
      name: data.name ?? "Brand Kit",
      primary_colors: data.primary_colors ?? ["#000000"],
      secondary_colors: data.secondary_colors ?? ["#FFFFFF"],
      fonts: data.fonts ?? [],
      logo_files: [],
      approved_phrases: data.approved_phrases ?? [],
      restricted_phrases: data.restricted_phrases ?? [],
      tone: data.tone ?? "",
      compliance_rules: {
        restricted_products: data.restricted_products ?? [],
      },
      created_at: now,
      updated_at: now,
    });
    return { brandKit };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create brand kit";
    return { error: message };
  }
}

export interface UpdateBrandKitInput {
  name?: string;
  primary_colors?: string[];
  secondary_colors?: string[];
  fonts?: string[];
  approved_phrases?: string[];
  restricted_phrases?: string[];
  tone?: string;
  restricted_products?: string[];
}

/**
 * Update brand kit colors, fonts, restrictions, and phrases.
 */
export async function updateBrandKit(
  id: string,
  data: UpdateBrandKitInput
): Promise<{ brandKit: BrandKit } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const brandKitsTable = db.table("brand_kits");

    const patch: Partial<Omit<BrandKit, "id">> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.primary_colors !== undefined) patch.primary_colors = data.primary_colors;
    if (data.secondary_colors !== undefined) patch.secondary_colors = data.secondary_colors;
    if (data.fonts !== undefined) patch.fonts = data.fonts;
    if (data.approved_phrases !== undefined) patch.approved_phrases = data.approved_phrases;
    if (data.restricted_phrases !== undefined)
      patch.restricted_phrases = data.restricted_phrases;
    if (data.tone !== undefined) patch.tone = data.tone;
    if (data.restricted_products !== undefined) {
      patch.compliance_rules = {
        restricted_products: data.restricted_products,
      };
    }

    const brandKit = await brandKitsTable.update(id, patch);
    return { brandKit };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update brand kit";
    return { error: message };
  }
}

/**
 * Fetch the brand kit for a company.
 */
export async function getBrandKit(
  companyId: string
): Promise<BrandKit | null> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const brandKitsTable = db.table("brand_kits");
    const result = await brandKitsTable.query({ company_id: companyId }, 1, 1);
    return result.data?.[0] ?? null;
  } catch {
    return null;
  }
}
