// ---------------------------------------------------------------------------
// MerchConciergeAgent — Claude claude-sonnet-4-6 with tool use + ZeroDB memory
// Stories 8.1, 8.2 — Issues #30, #31
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages.js";
import { CONCIERGE_SYSTEM_PROMPT, CONCIERGE_TOOLS } from "./prompts.js";
import {
  searchProducts,
  getBudgetStatus,
  createCampaignDraft,
  getCampaignHistory,
} from "./tools.js";
import type {
  ChatMessage,
  CampaignDraft,
  ConciergeStreamChunk,
  SearchProductsInput,
  GetBudgetStatusInput,
  CreateCampaignDraftInput,
  GetCampaignHistoryInput,
} from "../types.js";

const MODEL = "claude-sonnet-4-6";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

// ─── Memory helpers ───────────────────────────────────────────────────────────

async function storeConversation(
  companyId: string,
  messages: ChatMessage[]
): Promise<void> {
  const apiUrl =
    process.env["ZERODB_API_URL"]?.replace(/\/$/, "") ??
    "https://api.ainative.studio";
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiKey = process.env["ZERODB_API_KEY"];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  try {
    await fetch(`${apiUrl}/api/v1/projects/${PROJECT_ID}/memory/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        namespace: `company:${companyId}:concierge`,
        memory_type: "working",
        subject: "conversation",
        content: JSON.stringify(messages),
      }),
    });
  } catch {
    // Memory store failure is non-fatal
  }
}

async function recallConversation(
  companyId: string,
  query: string
): Promise<ChatMessage[]> {
  const apiUrl =
    process.env["ZERODB_API_URL"]?.replace(/\/$/, "") ??
    "https://api.ainative.studio";
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiKey = process.env["ZERODB_API_KEY"];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/projects/${PROJECT_ID}/memory/recall`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          namespace: `company:${companyId}:concierge`,
          query,
          limit: 10,
        }),
      }
    );

    if (res.ok) {
      const records = (await res.json()) as Array<{
        content: string;
        metadata?: Record<string, unknown>;
      }>;
      // Parse the most recent conversation record
      for (const record of records) {
        try {
          const parsed = JSON.parse(record.content) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // Not a conversation record — skip
        }
      }
    }
  } catch {
    // Recall failure is non-fatal
  }

  return [];
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function dispatchTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<{ result: unknown; draft?: CampaignDraft }> {
  switch (toolName) {
    case "search_products": {
      const result = await searchProducts(toolInput as SearchProductsInput);
      return { result };
    }
    case "get_budget_status": {
      const result = await getBudgetStatus(toolInput as GetBudgetStatusInput);
      return { result };
    }
    case "create_campaign_draft": {
      const draft = await createCampaignDraft(toolInput as CreateCampaignDraftInput);
      return { result: draft, draft };
    }
    case "get_campaign_history": {
      const result = await getCampaignHistory(toolInput as GetCampaignHistoryInput);
      return { result };
    }
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

// ─── MerchConciergeAgent ──────────────────────────────────────────────────────

export class MerchConciergeAgent {
  private readonly anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });
  }

  /**
   * Load conversation history for a company from ZeroDB memory.
   */
  async loadHistory(companyId: string): Promise<ChatMessage[]> {
    return recallConversation(companyId, "conversation history");
  }

  /**
   * Persist conversation history to ZeroDB memory.
   */
  async saveHistory(companyId: string, messages: ChatMessage[]): Promise<void> {
    await storeConversation(companyId, messages);
  }

  /**
   * Process a single user message and yield NDJSON stream chunks.
   * Handles multi-turn tool use transparently.
   *
   * @param message     The user's message text
   * @param history     Previous conversation messages
   * @param companyId   The company UUID for tool scoping
   * @yields ConciergeStreamChunk — text deltas, campaign_draft events, and done
   */
  async *chat(
    message: string,
    history: ChatMessage[],
    companyId: string
  ): AsyncGenerator<ConciergeStreamChunk> {
    // Build Anthropic message array from history
    const anthropicMessages: MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Append current user message
    anthropicMessages.push({ role: "user", content: message });

    let pendingDraft: CampaignDraft | undefined;

    // Agentic loop — runs until Claude stops requesting tools
    while (true) {
      const response = await this.anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: CONCIERGE_SYSTEM_PROMPT,
        tools: CONCIERGE_TOOLS,
        messages: anthropicMessages,
      });

      // Collect text and tool_use blocks from this response turn
      const toolUseBlocks: ToolUseBlock[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          // Yield text incrementally (word-level approximation)
          const words = block.text.split(" ");
          for (const word of words) {
            yield { type: "text", content: word + " " };
          }
        } else if (block.type === "tool_use") {
          toolUseBlocks.push(block);
        }
      }

      // Record assistant turn in history
      anthropicMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Stop if no tool calls requested
      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        break;
      }

      // Execute all tool calls and collect results
      const toolResults: ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        const toolInput = toolBlock.input as Record<string, unknown>;

        // Inject company_id if not provided by the model
        if (!toolInput["company_id"] && companyId) {
          toolInput["company_id"] = companyId;
        }

        try {
          const { result, draft } = await dispatchTool(toolBlock.name, toolInput);

          if (draft) {
            pendingDraft = draft;
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Tool execution failed",
            }),
            is_error: true,
          });
        }
      }

      // Feed tool results back to continue the agentic loop
      anthropicMessages.push({ role: "user", content: toolResults });
    }

    // Emit campaign draft chunk if a draft was created
    if (pendingDraft) {
      yield { type: "campaign_draft", draft: pendingDraft };
    }

    yield { type: "done" };
  }
}
