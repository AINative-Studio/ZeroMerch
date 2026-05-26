// Story 5.1 — Company Storefront (Issue #18)
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StorefrontClient } from "./storefront-client";
import { getServerZeroDBClient } from "@/lib/zerodb-server";

interface StorefrontPageProps {
  params: { companySlug: string };
  searchParams: { category?: string };
}

export async function generateMetadata({ params }: StorefrontPageProps): Promise<Metadata> {
  try {
    const db = getServerZeroDBClient();
    const result = await db.table("companies").query({ slug: params.companySlug, status: "active" }, 1, 1);
    const company = result.data[0];
    if (!company) return { title: "Store" };
    return { title: `${company.name} Store`, description: `Shop ${company.name} branded merchandise.` };
  } catch { return { title: "Store" }; }
}

export default async function StorefrontPage({ params, searchParams }: StorefrontPageProps) {
  const db = getServerZeroDBClient();
  let company;
  try {
    const result = await db.table("companies").query({ slug: params.companySlug, status: "active" }, 1, 1);
    company = result.data[0];
  } catch { company = null; }
  if (!company) notFound();

  let brandKit = null;
  if (company.brand_kit_id) {
    try { brandKit = await db.table("brand_kits").get(company.brand_kit_id); } catch { brandKit = null; }
  }

  let products: Awaited<ReturnType<typeof db.table<"products">["query"]>>["data"] = [];
  try {
    const result = await db.table("products").query({ company_id: company.id, status: "active" }, 1, 100);
    products = result.data;
  } catch { products = []; }

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort() as string[];

  return (
    <StorefrontClient
      company={company} brandKit={brandKit ?? null}
      products={products} categories={categories}
      initialCategory={searchParams.category ?? null}
    />
  );
}
