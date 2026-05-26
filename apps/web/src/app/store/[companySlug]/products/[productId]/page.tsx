// Story 5.2 — Product Detail Page (Issue #19)
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerZeroDBClient } from "@/lib/zerodb-server";
import { ProductDetailClient } from "./product-detail-client";

interface Props { params: { companySlug: string; productId: string }; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const db = getServerZeroDBClient();
    const product = await db.table("products").get(params.productId);
    return { title: product.name, description: product.description ?? undefined };
  } catch { return { title: "Product" }; }
}

export default async function ProductDetailPage({ params }: Props) {
  const db = getServerZeroDBClient();
  let company;
  try {
    const r = await db.table("companies").query({ slug: params.companySlug, status: "active" }, 1, 1);
    company = r.data[0];
  } catch { company = null; }
  if (!company) notFound();

  let product;
  try { product = await db.table("products").get(params.productId); }
  catch { return notFound() as never; }

  if (product.company_id !== company.id || product.status !== "active") notFound();

  let brandKit = null;
  if (company.brand_kit_id) {
    try { brandKit = await db.table("brand_kits").get(company.brand_kit_id); } catch { brandKit = null; }
  }

  let variants: Awaited<ReturnType<typeof db.table<"product_variants">["query"]>>["data"] = [];
  try {
    const r = await db.table("product_variants").query({ product_id: params.productId }, 1, 50);
    variants = r.data;
  } catch { variants = []; }

  return <ProductDetailClient company={company} brandKit={brandKit} product={product} variants={variants} />;
}
