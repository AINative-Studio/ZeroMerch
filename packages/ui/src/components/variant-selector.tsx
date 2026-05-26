"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface Variant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  price: number;
  inventory_count: number;
  status: string;
}

export interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: string | null;
  onSelect: (variant: Variant) => void;
  className?: string;
}

function inventoryStatus(count: number): { label: string; className: string } {
  if (count === 0) return { label: "Out of Stock", className: "bg-destructive/20 text-destructive border-destructive/30" };
  if (count < 10) return { label: `Low Stock (${count} left)`, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  return { label: "In Stock", className: "bg-green-500/20 text-green-400 border-green-500/30" };
}

const COLOR_SWATCHES: Record<string, string> = {
  black: "#0f0f0f", white: "#f8fafc", gray: "#6b7280", grey: "#6b7280",
  navy: "#1e3a5f", blue: "#3b82f6", red: "#ef4444", green: "#22c55e",
  yellow: "#eab308", orange: "#f97316", purple: "#a855f7", pink: "#ec4899",
  brown: "#92400e", beige: "#d4b896", cream: "#fef3c7", charcoal: "#374151",
  slate: "#64748b", teal: "#14b8a6", maroon: "#7f1d1d", olive: "#65a30d",
};

export function VariantSelector({ variants, selectedVariantId, onSelect, className }: VariantSelectorProps) {
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean) as string[]));
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean) as string[]));
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  function isSizeAvailable(size: string): boolean {
    if (selectedVariant?.color) return variants.some((v) => v.size === size && v.color === selectedVariant.color && v.inventory_count > 0);
    return variants.some((v) => v.size === size && v.inventory_count > 0);
  }

  function isColorAvailable(color: string): boolean {
    if (selectedVariant?.size) return variants.some((v) => v.color === color && v.size === selectedVariant.size && v.inventory_count > 0);
    return variants.some((v) => v.color === color && v.inventory_count > 0);
  }

  function handleSizeClick(size: string) {
    const match = variants.find((v) => v.size === size && (!selectedVariant?.color || v.color === selectedVariant.color))
      ?? variants.find((v) => v.size === size);
    if (match) onSelect(match);
  }

  function handleColorClick(color: string) {
    const match = variants.find((v) => v.color === color && (!selectedVariant?.size || v.size === selectedVariant.size))
      ?? variants.find((v) => v.color === color);
    if (match) onSelect(match);
  }

  const badge = selectedVariant !== null ? inventoryStatus(selectedVariant.inventory_count) : null;

  return (
    <div className={cn("space-y-4", className)}>
      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Size{selectedVariant?.size ? `: ${selectedVariant.size}` : ""}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select size">
            {sizes.map((size) => {
              const available = isSizeAvailable(size);
              const selected = selectedVariant?.size === size;
              return (
                <button key={size} type="button" disabled={!available} aria-pressed={selected}
                  aria-label={`Size ${size}${!available ? " — unavailable" : ""}`}
                  onClick={() => available && handleSizeClick(size)}
                  className={cn(
                    "h-10 min-w-[2.5rem] rounded-md border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/60",
                    !available && "cursor-not-allowed opacity-40"
                  )}>
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Color{selectedVariant?.color ? `: ${selectedVariant.color}` : ""}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select color">
            {colors.map((color) => {
              const available = isColorAvailable(color);
              const selected = selectedVariant?.color === color;
              const swatch = COLOR_SWATCHES[color.toLowerCase()] ?? "#94a3b8";
              return (
                <button key={color} type="button" disabled={!available} aria-pressed={selected}
                  aria-label={`Color ${color}${!available ? " — unavailable" : ""}`}
                  onClick={() => available && handleColorClick(color)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-primary/60",
                    !available && "cursor-not-allowed opacity-40"
                  )}
                  style={{ backgroundColor: swatch }} title={color} />
              );
            })}
          </div>
        </div>
      )}
      {badge && (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", badge.className)}>
          {badge.label}
        </span>
      )}
    </div>
  );
}
