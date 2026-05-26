// ---------------------------------------------------------------------------
// ZeroCommerce Product + Variant Types
// ---------------------------------------------------------------------------

export interface ZCVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  price: number;
  inventory_count: number;
  reorder_threshold: number;
  status: "active" | "inactive" | "out_of_stock";
}

export interface ZCProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  base_price: number;
  currency: string;
  status: "active" | "inactive" | "draft";
  variants: ZCVariant[];
}

export interface SyncResult {
  synced: number;
  products: string[];
  errors: string[];
}
