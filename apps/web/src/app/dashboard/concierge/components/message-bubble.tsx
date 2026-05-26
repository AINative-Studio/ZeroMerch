"use client";

// ---------------------------------------------------------------------------
// MessageBubble — user/assistant chat message variant
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Optional: show a streaming cursor at end of content */
  streaming?: boolean;
}

export function MessageBubble({ role, content, streaming = false }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar — assistant only */}
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          AI
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border bg-muted text-foreground"
        }`}
      >
        {/* Render content with basic whitespace preservation */}
        <span className="whitespace-pre-wrap">{content}</span>
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>

      {/* Avatar — user only */}
      {isUser && (
        <div className="ml-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          You
        </div>
      )}
    </div>
  );
}
