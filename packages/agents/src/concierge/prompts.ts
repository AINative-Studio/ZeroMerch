// ---------------------------------------------------------------------------
// Concierge system prompt + Anthropic tool schemas (Stories 8.1, 8.2)
// ---------------------------------------------------------------------------

import type Anthropic from "@anthropic-ai/sdk";

export const CONCIERGE_SYSTEM_PROMPT = `You are the ZeroMerch AI Concierge. You help company admins and marketers manage their corporate merchandise program. You can search and recommend products, create merch campaigns from natural language, check budget availability, and generate merch kits. Always be concise, professional, and budget-aware. When creating campaigns, always confirm before submitting.`;

export const CONCIERGE_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Search for merchandise products using natural language. Returns the top matching products from the company catalog.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural language search query, e.g. 'hoodies for a hackathon event'",
        },
        company_id: {
          type: "string",
          description: "The company UUID to scope the product search to",
        },
      },
      required: ["query", "company_id"],
    },
  },
  {
    name: "get_budget_status",
    description:
      "Fetch the current budget status for a company, including spend vs. limit for all active budgets.",
    input_schema: {
      type: "object",
      properties: {
        company_id: {
          type: "string",
          description: "The company UUID",
        },
      },
      required: ["company_id"],
    },
  },
  {
    name: "create_campaign_draft",
    description:
      "Create a draft merchandise campaign with selected products. The campaign will be in 'draft' status and marked as agent-generated. Always ask the user to confirm before calling this tool.",
    input_schema: {
      type: "object",
      properties: {
        company_id: {
          type: "string",
          description: "The company UUID",
        },
        name: {
          type: "string",
          description: "Campaign name, e.g. 'Hackathon 2026 Drop'",
        },
        type: {
          type: "string",
          enum: [
            "event_drop",
            "onboarding",
            "customer_gift",
            "employee_store",
            "vip_drop",
          ],
          description: "Campaign type",
        },
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of product UUIDs to include in the campaign",
        },
        budget_id: {
          type: "string",
          description: "Optional budget UUID to associate with this campaign",
        },
      },
      required: ["company_id", "name", "type", "product_ids"],
    },
  },
  {
    name: "get_campaign_history",
    description:
      "Search past campaigns using a natural language query. Returns semantically similar past campaigns.",
    input_schema: {
      type: "object",
      properties: {
        company_id: {
          type: "string",
          description: "The company UUID",
        },
        query: {
          type: "string",
          description:
            "Natural language query to find similar past campaigns, e.g. 'employee onboarding kits'",
        },
      },
      required: ["company_id", "query"],
    },
  },
];
