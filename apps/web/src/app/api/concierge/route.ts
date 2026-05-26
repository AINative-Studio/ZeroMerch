// ---------------------------------------------------------------------------
// POST /api/concierge — Streaming NDJSON concierge chat endpoint
// Stories 8.1, 8.2 — Issues #30, #31
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSession } from "@zeromerch/auth/session";
import { MerchConciergeAgent } from "@zeromerch/agents";
import type { ConciergeStreamChunk } from "@zeromerch/agents";

const agent = new MerchConciergeAgent();

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { message?: string; company_id?: string; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, company_id, session_id } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const companyId = company_id ?? session.user.company_id;
  if (!companyId) {
    return new Response(JSON.stringify({ error: "company_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Enforce tenant isolation
  if (companyId !== session.user.company_id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = session_id ?? `${companyId}-${Date.now()}`;

  // Load conversation history from ZeroDB memory
  const history = await agent.loadHistory(companyId);

  // Build a streaming NDJSON response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const updatedHistory = [
        ...history,
        { role: "user" as const, content: message, timestamp: new Date().toISOString() },
      ];

      let assistantResponse = "";

      try {
        for await (const chunk of agent.chat(message, history, companyId)) {
          const line = JSON.stringify(chunk) + "\n";
          controller.enqueue(encoder.encode(line));

          if (chunk.type === "text") {
            assistantResponse += chunk.content;
          }
        }

        // Persist updated history after the response
        updatedHistory.push({
          role: "assistant" as const,
          content: assistantResponse.trim(),
          timestamp: new Date().toISOString(),
        });

        await agent.saveHistory(companyId, updatedHistory);
      } catch (err) {
        const errorChunk: ConciergeStreamChunk = {
          type: "error",
          message: err instanceof Error ? err.message : "Agent error",
        };
        controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Session-Id": sessionId,
    },
  });
}
