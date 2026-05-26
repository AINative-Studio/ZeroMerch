import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StorefrontBrandBanner } from "./components/storefront-brand-banner";

export const metadata: Metadata = {
  title: { default: "Store", template: "%s | ZeroMerch Store" },
};

interface StorefrontLayoutProps {
  children: ReactNode;
  params: { companySlug: string };
}

export default function StorefrontLayout({ children, params }: StorefrontLayoutProps) {
  return (
    <>
      <StorefrontBrandBanner companySlug={params.companySlug} />
      {children}
    </>
  );
}
