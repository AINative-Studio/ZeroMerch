export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  category: string;
  sku: string;
  inStock: boolean;
  stockQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price?: number;
  attributes: Record<string, string>; // e.g. { size: "M", color: "black" }
  inStock: boolean;
  stockQuantity?: number;
}
