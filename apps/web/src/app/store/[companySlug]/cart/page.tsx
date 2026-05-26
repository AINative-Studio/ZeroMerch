// Story 5.3 — Shopping Cart (Issue #20)
import type { Metadata } from "next";
import { CartPageClient } from "./cart-page-client";

interface Props { params: { companySlug: string }; }
export const metadata: Metadata = { title: "Cart" };
export default function CartPage({ params }: Props) { return <CartPageClient companySlug={params.companySlug} />; }
