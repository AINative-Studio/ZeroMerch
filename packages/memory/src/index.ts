// ---------------------------------------------------------------------------
// @zeromerch/memory — Agent Memory Persistence Layer
// Story 10.1 — Issue #38
// ---------------------------------------------------------------------------

export { ZeroMemoryClient } from "./zerodb-memory.js";
export type { Memory, MemoryInput, MemoryType, RecallOptions, ZeroMemoryClientConfig } from "./zerodb-memory.js";
export { ns, buildNamespace, parseNamespace } from "./namespaces.js";
export type { NamespaceKey } from "./namespaces.js";
export { calculateDecay, applyDecayScores, identifyExpired, sortByFreshness } from "./decay.js";
export type { PruneResult } from "./decay.js";
