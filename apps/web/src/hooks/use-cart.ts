"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
}

export interface Cart {
  company_id: string;
  items: CartItem[];
  updated_at: string;
}

function storageKey(companyId: string): string {
  return `zeromerch_cart_${companyId}`;
}

function readCart(companyId: string): Cart {
  if (typeof window === "undefined") {
    return { company_id: companyId, items: [], updated_at: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return { company_id: companyId, items: [], updated_at: new Date().toISOString() };
    return JSON.parse(raw) as Cart;
  } catch {
    return { company_id: companyId, items: [], updated_at: new Date().toISOString() };
  }
}

function writeCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(cart.company_id), JSON.stringify(cart));
}

export interface UseCartReturn {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
}

export function useCart(companyId: string): UseCartReturn {
  const [cart, setCart] = useState<Cart>(() => readCart(companyId));

  useEffect(() => {
    setCart(readCart(companyId));
    function handleStorage(e: StorageEvent) {
      if (e.key === storageKey(companyId)) setCart(readCart(companyId));
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [companyId]);

  useEffect(() => { writeCart(cart); }, [cart]);

  const addItem = useCallback((incoming: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setCart((prev) => {
      const qty = incoming.quantity ?? 1;
      const idx = prev.items.findIndex((i) => i.variant_id === incoming.variant_id);
      const nextItems = idx >= 0
        ? prev.items.map((item, i) => i === idx ? { ...item, quantity: item.quantity + qty } : item)
        : [...prev.items, { ...incoming, quantity: qty }];
      return { ...prev, items: nextItems, updated_at: new Date().toISOString() };
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.variant_id !== variantId),
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.variant_id === variantId ? { ...i, quantity } : i),
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const clear = useCallback(() => {
    setCart({ company_id: companyId, items: [], updated_at: new Date().toISOString() });
  }, [companyId]);

  const total = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return { items: cart.items, itemCount, total, addItem, removeItem, updateQuantity, clear };
}
