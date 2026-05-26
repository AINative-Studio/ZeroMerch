// ---------------------------------------------------------------------------
// ZeroMemoryClient — ZeroDB memory API wrapper with namespace isolation
// Story 10.1 — Agent Memory Persistence (Issue #38)
// ---------------------------------------------------------------------------

import { calculateDecay, identifyExpired } from "./decay.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType = "working" | "episodic" | "semantic";

export interface Memory {
  id: string;
  namespace: string;
  subject: string;
  content: string;
  memory_type: MemoryType;
  entities: string[];
  importance: number;
  decay_score: number;
  source_ref?: string;
  created_at?: string;
}

export interface MemoryInput {
  subject: string;
  content: string;
  memory_type: MemoryType;
  entities?: string[];
  importance?: number;
  source_ref?: string;
}

export interface RecallOptions {
  /** Number of memories to return. Default: 10 */
  limit?: number;
  /** Filter to specific memory types. */
  memory_types?: MemoryType[];
  /** Only return memories with decay_score below this threshold. Default: 1.0 (all) */
  max_decay?: number;
}

export interface ZeroMemoryClientConfig {
  /** ZeroDB project ID. Defaults to process.env.ZERODB_PROJECT_ID */
  projectId?: string;
  /** Bearer token. Defaults to process.env.ZERODB_API_TOKEN */
  apiToken?: string;
  /** API key. Defaults to process.env.ZERODB_API_KEY */
  apiKey?: string;
  /** Base API URL. Defaults to https://api.ainative.studio */
  apiUrl?: string;
  /** Maximum retries on 429/503. Default: 3 */
  maxRetries?: number;
  /** Initial backoff in ms. Default: 500 */
  initialBackoffMs?: number;
}

// ─── ZeroMemoryClient ────────────────────────────────────────────────────────

/**
 * ZeroMemoryClient wraps the ZeroDB memory API with:
 * - Namespace-scoped isolation per company and domain
 * - Typed memory_type support (working / episodic / semantic)
 * - Decay-aware recall filtering
 * - LLM context injection formatting
 * - Working memory consolidation
 */
export class ZeroMemoryClient {
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly headers: Record<string, string>;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;

  constructor(config: ZeroMemoryClientConfig = {}) {
    const apiUrl =
      config.apiUrl ??
      (typeof process !== "undefined" ? process.env["ZERODB_API_URL"] : undefined) ??
      "https://api.ainative.studio";

    const apiToken =
      config.apiToken ??
      (typeof process !== "undefined" ? process.env["ZERODB_API_TOKEN"] : undefined);

    const apiKey =
      config.apiKey ??
      (typeof process !== "undefined" ? process.env["ZERODB_API_KEY"] : undefined);

    const projectId =
      config.projectId ??
      (typeof process !== "undefined" ? process.env["ZERODB_PROJECT_ID"] : undefined);

    if (!projectId) {
      throw new Error(
        "ZeroMemoryClient: ZERODB_PROJECT_ID is required. Set it via env or config.projectId."
      );
    }
    if (!apiToken && !apiKey) {
      throw new Error(
        "ZeroMemoryClient: Either ZERODB_API_TOKEN or ZERODB_API_KEY is required."
      );
    }

    this.baseUrl = apiUrl.replace(/\/$/, "");
    this.projectId = projectId;
    this.maxRetries = config.maxRetries ?? 3;
    this.initialBackoffMs = config.initialBackoffMs ?? 500;

    this.headers = { "Content-Type": "application/json" };
    if (apiToken) this.headers["Authorization"] = `Bearer ${apiToken}`;
    if (apiKey) this.headers["X-API-Key"] = apiKey;
  }

  // ─── HTTP layer ──────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let attempt = 0;
    let backoffMs = this.initialBackoffMs;

    while (true) {
      attempt += 1;

      const res = await fetch(url, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        if (res.status === 204) return undefined as unknown as T;
        return res.json() as Promise<T>;
      }

      const retryAfter = res.headers.get("Retry-After");
      if ((res.status === 429 || res.status === 503) && attempt <= this.maxRetries) {
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs;
        await new Promise((r) => setTimeout(r, waitMs));
        backoffMs = Math.min(backoffMs * 2, 30_000);
        continue;
      }

      let message = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as { detail?: string; message?: string };
        message = errBody.detail ?? errBody.message ?? message;
      } catch {
        // non-JSON error body — keep default
      }

      const err = new Error(`ZeroMemoryClient: ${message}`);
      (err as NodeJS.ErrnoException).code = String(res.status);
      throw err;
    }
  }

  private get memoryBasePath(): string {
    return `/api/v1/projects/${this.projectId}/memory`;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Store a memory in the given namespace.
   *
   * The namespace enforces company-level isolation — all recalls must
   * specify the same namespace to retrieve this record.
   */
  async store(namespace: string, memory: MemoryInput): Promise<Memory> {
    const body = {
      namespace,
      subject: memory.subject,
      content: memory.content,
      memory_type: memory.memory_type,
      entities: memory.entities ?? [],
      importance: memory.importance ?? 0.5,
      source_ref: memory.source_ref,
    };

    return this.request<Memory>("POST", `${this.memoryBasePath}/`, body);
  }

  /**
   * Recall memories matching a natural-language query within a namespace.
   *
   * Applies decay-score filtering after retrieval to suppress stale records
   * before they are returned to callers.
   */
  async recall(
    namespace: string,
    query: string,
    options: RecallOptions = {}
  ): Promise<Memory[]> {
    const limit = options.limit ?? 10;
    const body: Record<string, unknown> = {
      namespace,
      query,
      limit,
    };
    if (options.memory_types && options.memory_types.length > 0) {
      body["memory_types"] = options.memory_types;
    }

    const memories = await this.request<Memory[]>(
      "POST",
      `${this.memoryBasePath}/recall`,
      body
    );

    // Apply decay filter if requested
    const maxDecay = options.max_decay ?? 1.0;
    if (maxDecay < 1.0) {
      return memories.filter((m) => {
        const score = calculateDecay(m);
        m.decay_score = score;
        return score <= maxDecay;
      });
    }

    return memories;
  }

  /**
   * Delete a memory record by ID.
   */
  async forget(id: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `${this.memoryBasePath}/${id}`
    );
  }

  /**
   * Build a formatted context string for injection into LLM prompts.
   *
   * Recalls relevant memories then formats them as:
   * ```
   * === Agent Memory Context ===
   * [episodic] Acme prefers black hoodies (importance: 0.86)
   *   — Engineering leadership approved black heavyweight hoodies...
   * [semantic] Budget policy: max $120 per employee kit (importance: 0.9)
   *   — Per Q3 policy...
   * ===========================
   * ```
   */
  async injectContext(
    namespace: string,
    query: string,
    options: RecallOptions = {}
  ): Promise<string> {
    const memories = await this.recall(namespace, query, {
      limit: options.limit ?? 8,
      memory_types: options.memory_types,
      max_decay: options.max_decay ?? 0.85,
    });

    if (memories.length === 0) {
      return "";
    }

    const lines: string[] = ["=== Agent Memory Context ==="];
    for (const m of memories) {
      const importanceStr = m.importance.toFixed(2);
      lines.push(`[${m.memory_type}] ${m.subject} (importance: ${importanceStr})`);
      lines.push(`  — ${m.content}`);
    }
    lines.push("===========================");

    return lines.join("\n");
  }

  /**
   * Consolidate working memories in a namespace into episodic memories.
   *
   * This runs a recall for recent working memories, groups them by subject,
   * and for any group with more than one working memory it:
   * 1. Stores a new episodic memory summarising the group.
   * 2. Deletes all working memories in the group.
   *
   * This reduces noise in recall results and promotes key learnings into
   * longer-lived episodic storage.
   */
  async consolidate(namespace: string): Promise<void> {
    // Fetch working memories (up to 50 candidates)
    const workingMemories = await this.recall(namespace, "", {
      limit: 50,
      memory_types: ["working"],
    });

    if (workingMemories.length <= 1) return;

    // Group by subject
    const groups = new Map<string, Memory[]>();
    for (const m of workingMemories) {
      const key = m.subject.toLowerCase().trim();
      const group = groups.get(key) ?? [];
      group.push(m);
      groups.set(key, group);
    }

    // Consolidate groups with more than one entry
    const consolidatePromises: Promise<unknown>[] = [];

    for (const [, group] of groups) {
      if (group.length <= 1) continue;

      // Merge content from all working memories into one episodic
      const mergedContent = group
        .map((m) => m.content)
        .filter(Boolean)
        .join(" | ");

      const highestImportance = Math.max(...group.map((m) => m.importance ?? 0.5));
      const allEntities = [...new Set(group.flatMap((m) => m.entities ?? []))];

      // Store consolidated episodic memory
      consolidatePromises.push(
        this.store(namespace, {
          subject: group[0]!.subject,
          content: mergedContent,
          memory_type: "episodic",
          entities: allEntities,
          importance: highestImportance,
        })
      );

      // Delete original working memories
      for (const m of group) {
        consolidatePromises.push(this.forget(m.id));
      }
    }

    await Promise.all(consolidatePromises);
  }

  /**
   * Prune memories in a namespace whose decay score exceeds `threshold`.
   *
   * Fetches candidates via recall (broad query), scores them, and deletes
   * those above the threshold. Returns the count of deleted memories.
   */
  async pruneExpiredMemories(
    namespace: string,
    threshold = 0.9
  ): Promise<number> {
    const candidates = await this.recall(namespace, "", { limit: 100 });
    const expired = identifyExpired(candidates, threshold);

    await Promise.all(expired.map((m) => this.forget(m.id)));
    return expired.length;
  }
}
