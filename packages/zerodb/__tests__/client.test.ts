/**
 * Unit tests for ZeroDBClient
 * Uses fetch mocks — no real network calls.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZeroDBClient } from "../src/client.js";
import {
  ZeroDBAuthError,
  ZeroDBConfigError,
  ZeroDBNotFoundError,
  ZeroDBRateLimitError,
  ZeroDBValidationError,
} from "../src/errors.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ID = "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";
const API_TOKEN = "test-token-abc";
const BASE_URL = "https://api.ainative.studio";

function makeClient(overrides: Record<string, string> = {}): ZeroDBClient {
  return new ZeroDBClient({
    apiUrl: BASE_URL,
    apiToken: API_TOKEN,
    projectId: PROJECT_ID,
    maxRetries: 1,
    initialBackoffMs: 10,
    ...overrides,
  });
}

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}): FetchMock {
  const responseHeaders = new Headers(headers);
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => responseHeaders.get(key),
    },
    json: async () => body,
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function mockFetchSequence(responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>): FetchMock {
  let call = 0;
  const mock = vi.fn().mockImplementation(() => {
    const r = responses[Math.min(call++, responses.length - 1)];
    const responseHeaders = new Headers(r.headers ?? {});
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: {
        get: (key: string) => responseHeaders.get(key),
      },
      json: async () => r.body,
    });
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

// ─── Config / init ────────────────────────────────────────────────────────────

describe("ZeroDBClient — configuration", () => {
  it("throws ZeroDBConfigError when projectId is missing", () => {
    expect(
      () => new ZeroDBClient({ apiToken: API_TOKEN }),
    ).toThrow(ZeroDBConfigError);
  });

  it("throws ZeroDBConfigError when no credentials are provided", () => {
    const savedToken = process.env["ZERODB_API_TOKEN"];
    const savedKey = process.env["ZERODB_API_KEY"];
    delete process.env["ZERODB_API_TOKEN"];
    delete process.env["ZERODB_API_KEY"];
    try {
      expect(
        () => new ZeroDBClient({ projectId: PROJECT_ID }),
      ).toThrow(ZeroDBConfigError);
    } finally {
      if (savedToken !== undefined) process.env["ZERODB_API_TOKEN"] = savedToken;
      if (savedKey !== undefined) process.env["ZERODB_API_KEY"] = savedKey;
    }
  });

  it("accepts apiKey instead of apiToken", () => {
    expect(
      () => new ZeroDBClient({ projectId: PROJECT_ID, apiKey: "key-123" }),
    ).not.toThrow();
  });

  it("reads config from process.env", () => {
    const savedProjectId = process.env["ZERODB_PROJECT_ID"];
    const savedToken = process.env["ZERODB_API_TOKEN"];
    process.env["ZERODB_PROJECT_ID"] = PROJECT_ID;
    process.env["ZERODB_API_TOKEN"] = API_TOKEN;
    try {
      expect(() => new ZeroDBClient()).not.toThrow();
    } finally {
      if (savedProjectId !== undefined) {
        process.env["ZERODB_PROJECT_ID"] = savedProjectId;
      } else {
        delete process.env["ZERODB_PROJECT_ID"];
      }
      if (savedToken !== undefined) {
        process.env["ZERODB_API_TOKEN"] = savedToken;
      } else {
        delete process.env["ZERODB_API_TOKEN"];
      }
    }
  });
});

// ─── Table operations ─────────────────────────────────────────────────────────

describe("ZeroDBClient — table()", () => {
  afterEach(() => vi.restoreAllMocks());

  it("insert() POSTs to /tables/{name} and returns the row", async () => {
    const row = { id: "c1", name: "Acme", slug: "acme", domain: "acme.ai", default_currency: "USD", status: "active" as const, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    mockFetch(201, row);

    const client = makeClient();
    const result = await client.table("companies").insert({
      name: "Acme",
      slug: "acme",
      domain: "acme.ai",
      default_currency: "USD",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    expect(result).toEqual(row);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tables/companies`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("get() GETs /tables/{name}/{id}", async () => {
    const row = { id: "c1", name: "Acme", slug: "acme", domain: "acme.ai", default_currency: "USD", status: "active" as const, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    mockFetch(200, row);

    const client = makeClient();
    const result = await client.table("companies").get("c1");

    expect(result).toEqual(row);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tables/companies/c1`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("update() PATCHes /tables/{name}/{id}", async () => {
    const updated = { id: "c1", name: "Acme Updated", slug: "acme", domain: "acme.ai", default_currency: "USD", status: "active" as const, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" };
    mockFetch(200, updated);

    const client = makeClient();
    const result = await client.table("companies").update("c1", { name: "Acme Updated" });

    expect(result.name).toBe("Acme Updated");
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tables/companies/c1`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delete() DELETEs /tables/{name}/{id} and returns void", async () => {
    mockFetch(204, null);

    const client = makeClient();
    await expect(client.table("companies").delete("c1")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tables/companies/c1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("query() POSTs to /tables/{name}/query with filter", async () => {
    const pagedResult = { data: [], total: 0, page: 1, page_size: 50 };
    // query() calls GET first then POST /query — mock both
    mockFetchSequence([
      { status: 200, body: pagedResult },
      { status: 200, body: pagedResult },
    ]);

    const client = makeClient();
    const result = await client.table("companies").query({ status: "active" });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ─── Vector operations ────────────────────────────────────────────────────────

describe("ZeroDBClient — vector()", () => {
  afterEach(() => vi.restoreAllMocks());

  it("upsert() POSTs to /vectors/{collection}/upsert", async () => {
    mockFetch(200, { success: true });

    const client = makeClient();
    await client.vector("product_embeddings").upsert(
      "emb-1",
      [0.1, 0.2, 0.3],
      { category: "apparel" },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/vectors/product_embeddings/upsert`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "emb-1", embedding: [0.1, 0.2, 0.3], metadata: { category: "apparel" } }),
      }),
    );
  });

  it("search() POSTs to /vectors/{collection}/search and returns matches", async () => {
    const matches = [{ id: "emb-1", score: 0.95, metadata: { category: "apparel" } }];
    mockFetch(200, matches);

    const client = makeClient();
    const results = await client.vector("product_embeddings").search([0.1, 0.2, 0.3], 5);

    expect(results).toEqual(matches);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/vectors/product_embeddings/search`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query_vector: [0.1, 0.2, 0.3], top_k: 5 }),
      }),
    );
  });
});

// ─── Memory operations ────────────────────────────────────────────────────────

describe("ZeroDBClient — memory()", () => {
  afterEach(() => vi.restoreAllMocks());

  it("store() POSTs to /memory and returns a memory record", async () => {
    const stored = { id: "mem-1", content: "Acme prefers black hoodies", created_at: "2026-01-01T00:00:00Z" };
    mockFetch(201, stored);

    const client = makeClient();
    const result = await client.memory().store({ content: "Acme prefers black hoodies" });

    expect(result.id).toBe("mem-1");
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/memory`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("recall() POSTs to /memory/recall with query and top_k", async () => {
    const memories = [{ id: "mem-1", content: "Acme prefers black hoodies" }];
    mockFetch(200, memories);

    const client = makeClient();
    const results = await client.memory().recall("hoodie preferences", 5);

    expect(results).toEqual(memories);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/memory/recall`,
      expect.objectContaining({
        body: JSON.stringify({ query: "hoodie preferences", top_k: 5 }),
      }),
    );
  });

  it("forget() DELETEs /memory/{id}", async () => {
    mockFetch(204, null);

    const client = makeClient();
    await expect(client.memory().forget("mem-1")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/memory/mem-1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ─── Event operations ─────────────────────────────────────────────────────────

describe("ZeroDBClient — events()", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emit() POSTs to /events and returns an event record", async () => {
    const stored = { id: "evt-1", event_type: "order.paid", payload: { total: 115.50 }, created_at: "2026-01-01T00:00:00Z" };
    mockFetch(201, stored);

    const client = makeClient();
    const result = await client.events().emit("order.paid", { total: 115.50 });

    expect(result.id).toBe("evt-1");
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/events`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event_type: "order.paid", payload: { total: 115.50 } }),
      }),
    );
  });

  it("list() POSTs to /events/query with filter", async () => {
    const paged = { data: [], total: 0, page: 1, page_size: 50 };
    mockFetch(200, paged);

    const client = makeClient();
    const result = await client.events().list({ event_type: "order.paid" });

    expect(result.data).toEqual([]);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("ZeroDBClient — error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps 401 to ZeroDBAuthError", async () => {
    mockFetch(401, { detail: "Invalid token" });
    const client = makeClient();
    await expect(client.table("companies").get("x")).rejects.toBeInstanceOf(ZeroDBAuthError);
  });

  it("maps 404 to ZeroDBNotFoundError", async () => {
    mockFetch(404, { detail: "Not found" });
    const client = makeClient();
    await expect(client.table("companies").get("x")).rejects.toBeInstanceOf(ZeroDBNotFoundError);
  });

  it("maps 400 to ZeroDBValidationError", async () => {
    mockFetch(400, { detail: "Bad field" });
    const client = makeClient();
    await expect(
      client.table("companies").insert({
        name: "",
        slug: "",
        domain: "",
        default_currency: "USD",
        status: "active",
        created_at: "",
        updated_at: "",
      }),
    ).rejects.toBeInstanceOf(ZeroDBValidationError);
  });

  it("retries on 429 and eventually throws ZeroDBRateLimitError", async () => {
    // maxRetries=1 → 2 attempts total → second also 429 → throw
    mockFetchSequence([
      { status: 429, body: { detail: "Rate limited" }, headers: { "Retry-After": "0" } },
      { status: 429, body: { detail: "Rate limited" }, headers: { "Retry-After": "0" } },
    ]);

    const client = makeClient();
    await expect(client.table("companies").get("x")).rejects.toBeInstanceOf(ZeroDBRateLimitError);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 and succeeds on second attempt", async () => {
    const row = { id: "c1", name: "Acme", slug: "acme", domain: "acme.ai", default_currency: "USD", status: "active" as const, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
    mockFetchSequence([
      { status: 503, body: { detail: "Service unavailable" } },
      { status: 200, body: row },
    ]);

    const client = makeClient();
    const result = await client.table("companies").get("c1");
    expect(result).toEqual(row);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("sends Authorization header when apiToken is provided", async () => {
    mockFetch(200, { id: "c1" });
    const client = makeClient();
    await client.table("companies").get("c1");

    const callArgs = (global.fetch as FetchMock).mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${API_TOKEN}`);
  });

  it("sends X-API-Key header when apiKey is provided", async () => {
    mockFetch(200, { id: "c1" });
    const client = new ZeroDBClient({
      apiKey: "key-abc",
      projectId: PROJECT_ID,
      maxRetries: 1,
      initialBackoffMs: 10,
    });
    await client.table("companies").get("c1");

    const callArgs = (global.fetch as FetchMock).mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("key-abc");
  });
});

// ─── Multi-tenant scoping ─────────────────────────────────────────────────────

describe("ZeroDBClient — multi-tenant scoping", () => {
  afterEach(() => vi.restoreAllMocks());

  it("routes to the correct table based on collection name", async () => {
    mockFetch(200, { id: "u1", company_id: "co1", email: "jane@acme.ai", full_name: "Jane", role: "admin" as const, status: "active" as const, created_at: "2026-01-01T00:00:00Z" });
    const client = makeClient();
    await client.table("company_users").get("u1");

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tables/company_users/u1`,
      expect.anything(),
    );
  });

  it("routes to the correct vector collection", async () => {
    mockFetch(200, []);
    const client = makeClient();
    await client.vector("campaign_embeddings").search([0.5], 3);

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/projects/${PROJECT_ID}/vectors/campaign_embeddings/search`,
      expect.anything(),
    );
  });
});
