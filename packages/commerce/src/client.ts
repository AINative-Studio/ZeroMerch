// ---------------------------------------------------------------------------
// ZeroCommerceClient — stub returning 5 sample products
// ---------------------------------------------------------------------------

import type { ZCProduct } from "./types.js";

const SAMPLE_PRODUCTS: ZCProduct[] = [
  {
    id: "zc-prod-001",
    name: "Premium Heavyweight Hoodie",
    description:
      "400gsm heavyweight cotton blend hoodie with embroidered logo placement. Ideal for developer events, onboarding kits, and VIP gifting.",
    category: "apparel",
    tags: ["hoodie", "premium", "developer"],
    base_price: 65.0,
    currency: "USD",
    status: "active",
    variants: [
      { id: "zc-var-001-1", sku: "HOODIE-BLK-S",  size: "S",  color: "Black", price: 65.0, inventory_count: 80,  reorder_threshold: 20, status: "active" },
      { id: "zc-var-001-2", sku: "HOODIE-BLK-M",  size: "M",  color: "Black", price: 65.0, inventory_count: 120, reorder_threshold: 25, status: "active" },
      { id: "zc-var-001-3", sku: "HOODIE-BLK-L",  size: "L",  color: "Black", price: 65.0, inventory_count: 100, reorder_threshold: 25, status: "active" },
      { id: "zc-var-001-4", sku: "HOODIE-BLK-XL", size: "XL", color: "Black", price: 65.0, inventory_count: 60,  reorder_threshold: 15, status: "active" },
      { id: "zc-var-001-5", sku: "HOODIE-NVY-L",  size: "L",  color: "Navy",  price: 65.0, inventory_count: 40,  reorder_threshold: 10, status: "active" },
      { id: "zc-var-001-6", sku: "HOODIE-NVY-XL", size: "XL", color: "Navy",  price: 65.0, inventory_count: 30,  reorder_threshold: 10, status: "active" },
    ],
  },
  {
    id: "zc-prod-002",
    name: "Classic Crewneck Tee",
    description:
      "180gsm 100% combed cotton crew-neck t-shirt. Screen-print ready with vibrant color retention. Perfect for events and casual wear.",
    category: "apparel",
    tags: ["tee", "casual", "event"],
    base_price: 32.0,
    currency: "USD",
    status: "active",
    variants: [
      { id: "zc-var-002-1", sku: "TEE-WHT-S",  size: "S",  color: "White", price: 32.0, inventory_count: 200, reorder_threshold: 40, status: "active" },
      { id: "zc-var-002-2", sku: "TEE-WHT-M",  size: "M",  color: "White", price: 32.0, inventory_count: 300, reorder_threshold: 50, status: "active" },
      { id: "zc-var-002-3", sku: "TEE-WHT-L",  size: "L",  color: "White", price: 32.0, inventory_count: 250, reorder_threshold: 50, status: "active" },
      { id: "zc-var-002-4", sku: "TEE-WHT-XL", size: "XL", color: "White", price: 32.0, inventory_count: 180, reorder_threshold: 30, status: "active" },
      { id: "zc-var-002-5", sku: "TEE-BLK-M",  size: "M",  color: "Black", price: 32.0, inventory_count: 150, reorder_threshold: 30, status: "active" },
      { id: "zc-var-002-6", sku: "TEE-BLK-L",  size: "L",  color: "Black", price: 32.0, inventory_count: 130, reorder_threshold: 30, status: "active" },
    ],
  },
  {
    id: "zc-prod-003",
    name: "Snapback Cap",
    description:
      "Structured 6-panel snapback cap with embroidered front panel. Adjustable plastic snap closure. Great for outdoor events and brand ambassadors.",
    category: "accessories",
    tags: ["hat", "cap", "outdoor"],
    base_price: 28.0,
    currency: "USD",
    status: "active",
    variants: [
      { id: "zc-var-003-1", sku: "CAP-BLK-OS",  size: "One Size", color: "Black", price: 28.0, inventory_count: 150, reorder_threshold: 30, status: "active" },
      { id: "zc-var-003-2", sku: "CAP-NVY-OS",  size: "One Size", color: "Navy",  price: 28.0, inventory_count: 100, reorder_threshold: 20, status: "active" },
    ],
  },
  {
    id: "zc-prod-004",
    name: "Die-Cut Sticker Pack",
    description:
      "Custom die-cut vinyl stickers with UV-resistant laminate finish. Pack of 10 assorted designs. Weatherproof for laptop, water bottle, and gear use.",
    category: "stationery",
    tags: ["sticker", "swag", "event"],
    base_price: 12.0,
    currency: "USD",
    status: "active",
    variants: [
      { id: "zc-var-004-1", sku: "STICKER-MULTI-10", size: "Pack of 10", color: "Multi", price: 12.0, inventory_count: 500, reorder_threshold: 100, status: "active" },
    ],
  },
  {
    id: "zc-prod-005",
    name: "Ceramic Mug",
    description:
      "Premium ceramic mug with dishwasher-safe full-wrap logo print. Available in 11oz and 15oz. Ideal for office gifting and onboarding kits.",
    category: "drinkware",
    tags: ["mug", "office", "premium"],
    base_price: 22.0,
    currency: "USD",
    status: "active",
    variants: [
      { id: "zc-var-005-1", sku: "MUG-WHT-11OZ", size: "11oz", color: "White", price: 22.0, inventory_count: 200, reorder_threshold: 40, status: "active" },
      { id: "zc-var-005-2", sku: "MUG-WHT-15OZ", size: "15oz", color: "White", price: 24.0, inventory_count: 180, reorder_threshold: 40, status: "active" },
    ],
  },
];

export class ZeroCommerceClient {
  /**
   * Fetch the full product catalog from ZeroCommerce.
   * Currently returns 5 hardcoded sample products.
   */
  async fetchProducts(): Promise<ZCProduct[]> {
    return SAMPLE_PRODUCTS;
  }

  /**
   * Fetch a single product by its ZeroCommerce product ID.
   */
  async fetchProduct(id: string): Promise<ZCProduct | null> {
    return SAMPLE_PRODUCTS.find((p) => p.id === id) ?? null;
  }
}
