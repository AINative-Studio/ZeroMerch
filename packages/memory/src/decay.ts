// ---------------------------------------------------------------------------
// Memory Decay Scoring
// Story 10.1 — Agent Memory Persistence (Issue #38)
// ---------------------------------------------------------------------------

import type { Memory, MemoryType } from "./zerodb-memory.js";

// ─── Decay windows by memory type (in days) ──────────────────────────────────

/**
 * Full decay age in days per memory type.
 * At this age a memory reaches a decay_score of 1.0.
 *
 * - working   →  90 days (short-lived operational context)
 * - episodic  → 365 days (event-tied, medium persistence)
 * - semantic  → 730 days (long-lived facts, slow decay)
 */
const DECAY_WINDOW_DAYS: Record<MemoryType, number> = {
  working: 90,
  episodic: 365,
  semantic: 730,
};

// ─── Core scoring ─────────────────────────────────────────────────────────────

/**
 * Calculate a linear decay score in [0, 1] for a memory.
 *
 * score = age_days / full_decay_days
 *
 * A score of 0 means fresh (just stored), 1.0 means fully decayed.
 * Values above 1.0 are clamped to 1.0.
 *
 * @param memory  - The memory record to score.
 * @param nowMs   - Optional override for "now" (milliseconds since epoch).
 *                  Defaults to Date.now(). Useful for testing.
 */
export function calculateDecay(memory: Memory, nowMs = Date.now()): number {
  const createdAt = memory.created_at ? new Date(memory.created_at).getTime() : nowMs;
  const ageMs = Math.max(0, nowMs - createdAt);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  const windowDays = DECAY_WINDOW_DAYS[memory.memory_type] ?? DECAY_WINDOW_DAYS.working;
  const score = ageDays / windowDays;
  return Math.min(1.0, score);
}

/**
 * Apply decay scoring to a list of memories in-place.
 * Returns the same array with `decay_score` fields updated.
 */
export function applyDecayScores(memories: Memory[], nowMs = Date.now()): Memory[] {
  for (const m of memories) {
    m.decay_score = calculateDecay(m, nowMs);
  }
  return memories;
}

// ─── Pruning ──────────────────────────────────────────────────────────────────

export interface PruneResult {
  /** Number of memories evaluated. */
  evaluated: number;
  /** IDs of memories deleted. */
  deleted: string[];
  /** Memories retained (decay_score below threshold). */
  retained: number;
}

/**
 * Identify memories whose decay_score exceeds `threshold`.
 * Returns the list of expired memories for the caller to delete.
 *
 * Deletion is intentionally left to the caller so this function stays pure
 * (no async side effects, fully testable without network).
 *
 * @param memories  - Memories to evaluate (should include created_at).
 * @param threshold - Decay score above which a memory is considered expired.
 *                    Default: 0.9 (10 % safety margin before full decay).
 * @param nowMs     - Optional override for "now" in milliseconds.
 */
export function identifyExpired(
  memories: Memory[],
  threshold = 0.9,
  nowMs = Date.now()
): Memory[] {
  return memories.filter((m) => calculateDecay(m, nowMs) > threshold);
}

/**
 * Sort memories by decay score ascending (freshest first).
 * Mutates the input array.
 */
export function sortByFreshness(memories: Memory[]): Memory[] {
  return memories.sort((a, b) => (a.decay_score ?? 0) - (b.decay_score ?? 0));
}
