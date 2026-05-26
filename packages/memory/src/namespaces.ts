// ---------------------------------------------------------------------------
// Memory Namespace Constants + Builder Functions
// Story 10.1 — Agent Memory Persistence (Issue #38)
// ---------------------------------------------------------------------------

/**
 * Namespace builders keyed by domain.
 *
 * All namespaces follow the pattern: `company:{companyId}:{domain}`
 * This enforces per-tenant isolation at the namespace level —
 * every recall and store call is scoped to a single company.
 */
export const ns = {
  /** Brand identity, tone, compliance rules, approved phrases. */
  brand: (companyId: string) => `company:${companyId}:brand`,

  /** Campaign outcomes, learnings, and agent-generated insights. */
  campaigns: (companyId: string) => `company:${companyId}:campaigns`,

  /** Vendor capabilities, quality scores, turnaround notes. */
  vendors: (companyId: string) => `company:${companyId}:vendors`,

  /** Employee size preferences, color preferences, purchase history. */
  preferences: (companyId: string) => `company:${companyId}:employee_preferences`,

  /** Customer gifting history, deal-linked sends, VIP notes. */
  gifting: (companyId: string) => `company:${companyId}:customer_gifting`,

  /** Budget policy rules, spend thresholds, approval workflows. */
  budget: (companyId: string) => `company:${companyId}:budget_policy`,
} as const;

export type NamespaceKey = keyof typeof ns;

/**
 * Build a fully-qualified namespace string from a key and company ID.
 * Convenience wrapper for callers that receive the key at runtime.
 */
export function buildNamespace(key: NamespaceKey, companyId: string): string {
  return ns[key](companyId);
}

/**
 * Parse a namespace string back into its components.
 * Returns null if the string does not match the expected pattern.
 */
export function parseNamespace(
  namespace: string
): { companyId: string; domain: string } | null {
  const match = namespace.match(/^company:([^:]+):(.+)$/);
  if (!match) return null;
  return { companyId: match[1]!, domain: match[2]! };
}
