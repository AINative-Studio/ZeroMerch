"use client";

// ---------------------------------------------------------------------------
// BudgetPill — header spend display component
// ---------------------------------------------------------------------------

interface BudgetPillProps {
  spent: number;
  limit: number;
  currency?: string;
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BudgetPill({ spent, limit, currency = "USD" }: BudgetPillProps) {
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const isWarning = pct >= 80;
  const isDanger = pct >= 100;

  const pillColor = isDanger
    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
    : isWarning
    ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
    : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";

  const dotColor = isDanger
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${pillColor}`}
      title={`${pct}% of budget used`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      Spent {formatCurrency(spent, currency)} of {formatCurrency(limit, currency)}
    </span>
  );
}
