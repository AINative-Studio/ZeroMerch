/**
 * ZeroDBClient — single entry point for all ZeroDB operations.
 *
 * Reads configuration from process.env:
 *   ZERODB_API_URL       — base URL (default: https://api.ainative.studio)
 *   ZERODB_API_TOKEN     — Bearer token
 *   ZERODB_API_KEY       — API key header
 *   ZERODB_PROJECT_ID    — project UUID
 */

import {
  ZeroDBConfigError,
  mapStatusToError,
} from "./errors.js";
import type {
  CollectionName,
  CollectionTypeMap,
  EventRecord,
  MemoryRecord,
  QueryFilter,
  VectorMatch,
  ZeroDBPagedResponse,
} from "./types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ZeroDBClientConfig {
  /** Base URL. Defaults to process.env.ZERODB_API_URL or https://api.ainative.studio */
  apiUrl?: string;
  /** Bearer token. Defaults to process.env.ZERODB_API_TOKEN */
  apiToken?: string;
  /** API key. Defaults to process.env.ZERODB_API_KEY */
  apiKey?: string;
  /** Project UUID. Defaults to process.env.ZERODB_PROJECT_ID */
  projectId?: string;
  /** Maximum number of retries on 429/503. Default: 3 */
  maxRetries?: number;
  /** Initial backoff in ms. Default: 500 */
  initialBackoffMs?: number;
}

// ─── Sub-clients ─────────────────────────────────────────────────────────────

export interface TableClient<T> {
  /** Insert a new row. Returns the created row with its server-assigned id. */
  insert(data: Omit<T, "id">): Promise<T>;
  /** Query rows by filter. Returns a paged result. */
  query(filter?: QueryFilter, page?: number, pageSize?: number): Promise<ZeroDBPagedResponse<T>>;
  /** Get a single row by id. */
  get(id: string): Promise<T>;
  /** Update a row by id. Returns the updated row. */
  update(id: string, data: Partial<Omit<T, "id">>): Promise<T>;
  /** Delete a row by id. */
  delete(id: string): Promise<void>;
}

export interface VectorClient {
  /** Upsert a vector embedding with associated metadata. */
  upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;
  /** Search for similar vectors. Returns ranked matches with scores. */
  search(queryVector: number[], topK?: number): Promise<VectorMatch[]>;
}

export interface MemoryClient {
  /** Store a memory record. Returns the stored record with its server-assigned id. */
  store(memory: Omit<MemoryRecord, "id" | "created_at">): Promise<MemoryRecord>;
  /** Recall memories matching a natural-language query. */
  recall(query: string, topK?: number): Promise<MemoryRecord[]>;
  /** Delete a memory record by id. */
  forget(id: string): Promise<void>;
}

export interface EventsClient {
  /** Emit a new event. Returns the stored event record. */
  emit(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<EventRecord>;
  /** List events with optional filter. */
  list(filter?: QueryFilter, page?: number, pageSize?: number): Promise<ZeroDBPagedResponse<EventRecord>>;
}

// ─── Client Implementation ───────────────────────────────────────────────────

export class ZeroDBClient {
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly headers: Record<string, string>;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;

  constructor(config: ZeroDBClientConfig = {}) {
    const apiUrl =
      config.apiUrl ??
      process.env["ZERODB_API_URL"] ??
      "https://api.ainative.studio";
    const apiToken = config.apiToken ?? process.env["ZERODB_API_TOKEN"];
    const apiKey = config.apiKey ?? process.env["ZERODB_API_KEY"];
    const projectId = config.projectId ?? process.env["ZERODB_PROJECT_ID"];

    if (!projectId) {
      throw new ZeroDBConfigError(
        "ZERODB_PROJECT_ID is required. Set it via env or ZeroDBClientConfig.projectId.",
      );
    }
    if (!apiToken && !apiKey) {
      throw new ZeroDBConfigError(
        "Either ZERODB_API_TOKEN or ZERODB_API_KEY is required.",
      );
    }

    this.baseUrl = apiUrl.replace(/\/$/, "");
    this.projectId = projectId;
    this.maxRetries = config.maxRetries ?? 3;
    this.initialBackoffMs = config.initialBackoffMs ?? 500;

    this.headers = {
      "Content-Type": "application/json",
    };
    if (apiToken) {
      this.headers["Authorization"] = `Bearer ${apiToken}`;
    }
    if (apiKey) {
      this.headers["X-API-Key"] = apiKey;
    }
  }

  // ─── Low-level HTTP ─────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
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
        // 204 No Content
        if (res.status === 204) {
          return undefined as unknown as T;
        }
        return res.json() as Promise<T>;
      }

      const retryAfter = res.headers.get("Retry-After");

      if ((res.status === 429 || res.status === 503) && attempt <= this.maxRetries) {
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs;
        await this.sleep(waitMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
        continue;
      }

      let message = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as { detail?: string; message?: string };
        message = errBody.detail ?? errBody.message ?? message;
      } catch {
        // body was not JSON — keep the default message
      }

      throw mapStatusToError(res.status, message, retryAfter);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Table Operations ───────────────────────────────────────────────────

  /**
   * Returns a typed sub-client scoped to a specific ZeroDB table.
   * All operations automatically include company_id for multi-tenant isolation
   * when the filter is a table that holds company_id.
   */
  table<K extends CollectionName>(name: K): TableClient<CollectionTypeMap[K]> {
    type Row = CollectionTypeMap[K];
    const basePath = `/api/v1/projects/${this.projectId}/tables/${name}`;

    return {
      insert: (data: Omit<Row, "id">) =>
        this.request<Row>("POST", basePath, data),

      query: (filter?: QueryFilter, page = 1, pageSize = 50) =>
        this.request<ZeroDBPagedResponse<Row>>("GET", basePath, undefined).then(
          () =>
            this.request<ZeroDBPagedResponse<Row>>(
              "POST",
              `${basePath}/query`,
              { filter: filter ?? {}, page, page_size: pageSize },
            ),
        ),

      get: (id: string) =>
        this.request<Row>("GET", `${basePath}/${id}`),

      update: (id: string, data: Partial<Omit<Row, "id">>) =>
        this.request<Row>("PATCH", `${basePath}/${id}`, data),

      delete: async (id: string) => {
        await this.request<void>("DELETE", `${basePath}/${id}`);
      },
    };
  }

  // ─── Vector Operations ──────────────────────────────────────────────────

  /**
   * Returns a sub-client scoped to a named vector collection.
   */
  vector(collection: string): VectorClient {
    const basePath = `/api/v1/projects/${this.projectId}/vectors/${collection}`;

    return {
      upsert: async (
        id: string,
        embedding: number[],
        metadata: Record<string, unknown>,
      ) => {
        await this.request<unknown>("POST", `${basePath}/upsert`, {
          id,
          embedding,
          metadata,
        });
      },

      search: (queryVector: number[], topK = 10) =>
        this.request<VectorMatch[]>("POST", `${basePath}/search`, {
          query_vector: queryVector,
          top_k: topK,
        }),
    };
  }

  // ─── Memory Operations ──────────────────────────────────────────────────

  /**
   * Returns a sub-client for ZeroMemory operations.
   */
  memory(): MemoryClient {
    const basePath = `/api/v1/projects/${this.projectId}/memory`;

    return {
      store: (memory: Omit<MemoryRecord, "id" | "created_at">) =>
        this.request<MemoryRecord>("POST", basePath, memory),

      recall: (query: string, topK = 10) =>
        this.request<MemoryRecord[]>("POST", `${basePath}/recall`, {
          query,
          top_k: topK,
        }),

      forget: async (id: string) => {
        await this.request<void>("DELETE", `${basePath}/${id}`);
      },
    };
  }

  // ─── Event Operations ───────────────────────────────────────────────────

  /**
   * Returns a sub-client for ZeroDB event stream operations.
   */
  events(): EventsClient {
    const basePath = `/api/v1/projects/${this.projectId}/events`;

    return {
      emit: (eventType: string, payload: Record<string, unknown>) =>
        this.request<EventRecord>("POST", basePath, {
          event_type: eventType,
          payload,
        }),

      list: (filter?: QueryFilter, page = 1, pageSize = 50) =>
        this.request<ZeroDBPagedResponse<EventRecord>>(
          "POST",
          `${basePath}/query`,
          { filter: filter ?? {}, page, page_size: pageSize },
        ),
    };
  }
}
