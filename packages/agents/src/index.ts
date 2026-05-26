/**
 * @zeromerch/agents
 *
 * AI agent package for ZeroMerch.
 * Provides MerchConciergeAgent with Claude claude-sonnet-4-6 tool use, ZeroDB memory, and streaming.
 */

export { MerchConciergeAgent } from "./concierge/agent.js";
export { generateCampaignFromPrompt } from "./concierge/campaign-generator.js";
export type { GeneratedCampaign } from "./concierge/campaign-generator.js";
export { CONCIERGE_SYSTEM_PROMPT, CONCIERGE_TOOLS } from "./concierge/prompts.js";
export {
  searchProducts,
  getBudgetStatus,
  createCampaignDraft,
  getCampaignHistory,
} from "./concierge/tools.js";
export type {
  ChatMessage,
  ProductRecommendation,
  BudgetStatus,
  CampaignDraft,
  ConciergeRequest,
  ConciergeStreamChunk,
  MessageRole,
  SearchProductsInput,
  GetBudgetStatusInput,
  CreateCampaignDraftInput,
  GetCampaignHistoryInput,
  ToolResult,
} from "./types.js";

export { analyzeBudgetSpend } from "./budget-advisor.js";
export type {
  BudgetInsights,
  BudgetAnomaly,
  SpendForecast,
  OptimizationSuggestion,
} from "./budget-advisor.js";

export { reviewDesignAsset, overrideReview } from "./brand-compliance.js";
export type { DesignReview, ReviewStatus } from "./brand-compliance.js";
