"use client";

// ---------------------------------------------------------------------------
// Dashboard — Approval Queue (Story 9.2, Issue #35)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import { getPendingApprovals, approveRequest, rejectRequest, escalateRequest } from "@/app/actions/approvals";
import type { ApprovalRequest } from "@/app/actions/approvals";

function TypeBadge({ type }: { type: ApprovalRequest["request_type"] }) {
  const styles: Record<typeof type, string> = {
    order: "bg-blue-100 text-blue-800",
    campaign: "bg-purple-100 text-purple-800",
    design: "bg-pink-100 text-pink-800",
    budget_exception: "bg-orange-100 text-orange-800",
  };
  const labels: Record<typeof type, string> = {
    order: "Order",
    campaign: "Campaign",
    design: "Design",
    budget_exception: "Budget Exception",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function ApprovalRow({
  approval,
  userId,
  companyId,
  onResolved,
}: {
  approval: ApprovalRequest;
  userId: string;
  companyId: string;
  onResolved: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  const isApprover = userId === approval.approver_user_id;

  function act(fn: () => Promise<{ error: string } | unknown>) {
    setRowError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && typeof result === "object" && "error" in result) {
        setRowError((result as { error: string }).error);
        return;
      }
      onResolved(approval.id);
    });
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="px-4 py-3">
        <Link href={`/dashboard/approvals/${approval.id}`} className="font-medium text-sm hover:underline">
          {approval.request_type.replace("_", " ")}
        </Link>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{approval.request_ref_id}</p>
      </td>
      <td className="px-4 py-3"><TypeBadge type={approval.request_type} /></td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{approval.requested_by}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(approval.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {approval.status === "escalated" && (
          <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs font-medium">Escalated</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isApprover && !isPending && !showReject && (
          <div className="flex gap-2">
            <button
              onClick={() => act(() => approveRequest(approval.id, userId))}
              className="inline-flex h-7 items-center rounded-md bg-green-600 px-2.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="inline-flex h-7 items-center rounded-md border border-red-300 bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => act(() => escalateRequest(approval.id, companyId))}
              className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Escalate
            </button>
          </div>
        )}
        {isApprover && !isPending && showReject && (
          <div className="flex gap-2 items-center">
            <input
              type="text" autoFocus value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason…"
              className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              onClick={() => act(() => rejectRequest(approval.id, userId, rejectReason))}
              disabled={!rejectReason.trim()}
              className="inline-flex h-7 items-center rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowReject(false); setRejectReason(""); }}
              className="inline-flex h-7 items-center rounded-md border border-input px-2 text-xs hover:bg-accent transition-colors"
            >
              ×
            </button>
          </div>
        )}
        {isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
        {rowError && <p className="text-xs text-red-600 mt-1">{rowError}</p>}
      </td>
    </tr>
  );
}

export default function ApprovalsPage() {
  const { user, companyId } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !user?.id) return;
    setIsLoading(true);
    getPendingApprovals(companyId, user.id).then((result) => {
      if ("approvals" in result) setApprovals(result.approvals);
      else setError(result.error);
      setIsLoading(false);
    });
  }, [companyId, user?.id]);

  function handleResolved(id: string) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading approvals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground">Requests awaiting your decision.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {approvals.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Request</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">From</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Flags</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <ApprovalRow
                  key={a.id}
                  approval={a}
                  userId={user?.id ?? ""}
                  companyId={companyId ?? ""}
                  onResolved={handleResolved}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No pending approvals.</p>
        </div>
      )}

      <div className="text-right">
        <Link href="/dashboard/approvals/history" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View approval history
        </Link>
      </div>
    </div>
  );
}
