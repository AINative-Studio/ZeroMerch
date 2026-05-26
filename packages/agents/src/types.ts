// ---------------------------------------------------------------------------
// Shared types for the @zeromerch/agents package
// Used by concierge agent, tools, and campaign-generator
// ---------------------------------------------------------------------------

import type { CampaignType } from "@zeromerch/zerodb";

// ─── Chat / Message types ──────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

// ─── Concierge I/O ────────────────────────────────────────────────────────

export interface ConciergeRequest {
  message: string;
  company_id: string;
  session_id: string;
}

export type ConciergeStreamChunk =
  | { type: "text"; content: string }
  | { type: "campaign_draft"; draft: CampaignDraft }
  | { type: "error"; message: string }
  | { type: "done" };

// ─── Tool input types ──────────────────────────────────────────────────────

export interface SearchProductsInput {
  query: string;
  company_id: string;
}

export interface GetBudgetStatusInput {
  company_id: string;
}

export interface CreateCampaignDraftInput {
  company_id: string;
  name: string;
  type: CampaignType;
  product_ids: string[];
  budget_id?: string;
}

export interface GetCampaignHistoryInput {
  company_id: string;
  query: string;
}

// ─── Tool result types ─────────────────────────────────────────────────────

export interface ProductRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  currency: string;
  score?: number;
}

export interface BudgetStatus {
  id: string;
  name: string;
  spent: number;
  limit: number;
  currency: string;
  spend_pct: number;
  status: string;
}

export interface CampaignDraft {
  id: string;
  name: string;
  type: CampaignType;
  product_ids: string[];
  budget_id?: string;
  status: "draft";
  agent_generated: true;
  created_at: string;
}

export interface ToolResult {
  tool_name: string;
  result: unknown;
  error?: string;
}
