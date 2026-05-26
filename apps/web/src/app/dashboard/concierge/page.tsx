"use client";

// ---------------------------------------------------------------------------
// Dashboard — AI Merch Concierge chat (Stories 8.1, 8.2, Issues #30, #31)
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getBudgetPillData } from "@/app/actions/concierge";
import { BudgetPill } from "./components/budget-pill";
import { MessageBubble } from "./components/message-bubble";
import { CampaignConfirmCard } from "./components/campaign-confirm-card";
import type { CampaignDraft } from "@zeromerch/agents";
import type { BudgetPillData } from "@/app/actions/concierge";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface DisplayMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** If set, render campaign confirm card below this message */
  campaignDraft?: CampaignDraft;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConciergePage() {
  const { user, companyId: authCompanyId } = useAuth();
  const companyId = authCompanyId ?? user?.company_id ?? "";
  const sessionId = useRef(`${companyId}-${Date.now()}`);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your ZeroMerch AI Concierge. I can help you discover products, check your budget, and create merchandise campaigns. What would you like to do today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetPillData | null>(null);
  const [, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingIdRef = useRef<string | null>(null);

  // Load budget pill data
  useEffect(() => {
    if (!companyId) return;
    startTransition(async () => {
      const data = await getBudgetPillData(companyId);
      setBudgetData(data);
    });
  }, [companyId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Append user message
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    // Create placeholder assistant message
    const assistantId = `assistant-${Date.now()}`;
    streamingIdRef.current = assistantId;

    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          company_id: companyId,
          session_id: sessionId.current,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as {
              type: string;
              content?: string;
              draft?: CampaignDraft;
              message?: string;
            };

            if (chunk.type === "text" && chunk.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk.content }
                    : m
                )
              );
            } else if (chunk.type === "campaign_draft" && chunk.draft) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, campaignDraft: chunk.draft }
                    : m
                )
              );
            } else if (chunk.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          `Sorry, I encountered an error: ${chunk.message ?? "Unknown error"}`,
                      }
                    : m
                )
              );
            }
          } catch {
            // Malformed NDJSON line — skip
          }
        }
      }
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Failed to connect to concierge";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content || `Sorry, something went wrong: ${errorText}`,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = null;

      // Refresh budget data after interaction (campaign may have changed spend)
      if (companyId) {
        startTransition(async () => {
          const data = await getBudgetPillData(companyId);
          setBudgetData(data);
        });
      }
    }
  }, [input, isStreaming, companyId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            AI Merch Concierge
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your intelligent merchandise assistant
          </p>
        </div>

        {/* Budget pill */}
        {budgetData && (
          <BudgetPill
            spent={budgetData.spent}
            limit={budgetData.limit}
            currency={budgetData.currency}
          />
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto max-w-3xl space-y-4 px-2">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble
                role={msg.role}
                content={msg.content}
                streaming={isStreaming && msg.id === streamingIdRef.current}
              />

              {/* Campaign draft confirmation card */}
              {msg.campaignDraft && (
                <div
                  className={`mt-2 ${msg.role === "assistant" ? "ml-9" : "mr-9"}`}
                >
                  <CampaignConfirmCard
                    draft={msg.campaignDraft}
                    companyId={companyId}
                    onApprove={(campaignId) => {
                      // Append a confirmation message
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `confirm-${campaignId}`,
                          role: "assistant",
                          content: `Campaign "${msg.campaignDraft?.name}" has been activated. You can view it in the Campaigns dashboard.`,
                        },
                      ]);
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border pt-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to recommend products, check your budget, or create a campaign..."
              rows={1}
              disabled={isStreaming}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ overflowY: "auto" }}
            />

            <button
              onClick={() => void sendMessage()}
              disabled={isStreaming || !input.trim()}
              className="flex-shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              {isStreaming ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary-foreground [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary-foreground [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary-foreground" />
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
