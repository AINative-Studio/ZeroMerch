"use client";

// ---------------------------------------------------------------------------
// Dashboard — Approval Detail (Story 9.2, Issue #35)
// ---------------------------------------------------------------------------

import { useState, useEffect, use, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@zeromerch/auth";
import { getApprovalRequest, approveRequest, rejectRequest, escalateRequest } from "@/app/actions/approvals";
import type { ApprovalRequest } from "@/app/actions/approvals";

function StatusBadge({ status }: { status: ApprovalRequest["status"] }) {
  const styles: Record<typeof status, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    escalated: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, companyId } = useAuth();
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setIsLoading(true);
    getApprovalRequest(id).then((result) => {
      if ("approval" in result) setApproval(result.approval);
      else setError(result.error);
      setIsLoading(false);
    });
  }, [id]);

  function handleApprove() {
    if (!user?.id) return;
    startTransition(async () => {
      const result = await approveRequest(id, user.id, notes || undefined);
      if ("error" in result) setError(result.error);
      else router.push("/dashboard/approvals");
    });
  }

  function handleReject() {
    if (!user?.id || !rejectReason.trim()) return;
    startTransition(async () => {
      const result = await rejectRequest(id, user.id, rejectReason);
      if ("error" in result) setError(result.error);
      else router.push("/dashboard/approvals");
    });
  }

  function handleEscalate() {
    if (!companyId) return;
    startTransition(async () => {
      const result = await escalateRequest(id, companyId);
      if ("error" in result) setError(result.error);
      else router.push("/dashboard/approvals");
    });
  }

  if (isLoading) return <div className="flex items-center justify-center py-16"><p className="text-muted-foreground">Loading request...</p></div>;

  if (error || !approval) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error ?? "Approval request not found"}</div>
        <Link href="/dashboard/approvals" className="text-sm text-primary hover:underline">Back to approval queue</Link>
      </div>
    );
  }

  const isResolved = approval.status !== "pending" && approval.status !== "escalated";
  const isApprover = user?.id === approval.approver_user_id;
  const canAct = !isResolved && isApprover;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/approvals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Approval Queue
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight capitalize">
            {approval.request_type.replace("_", " ")} Request
          </h1>
          <StatusBadge status={approval.status} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Request Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-xs font-medium text-muted-foreground uppercase">Type</dt><dd className="mt-0.5 capitalize">{approval.request_type.replace("_", " ")}</dd></div>
          <div><dt className="text-xs font-medium text-muted-foreground uppercase">Reference ID</dt><dd className="mt-0.5 font-mono text-xs">{approval.request_ref_id}</dd></div>
          <div><dt className="text-xs font-medium text-muted-foreground uppercase">Requested by</dt><dd className="mt-0.5">{approval.requested_by}</dd></div>
          <div><dt className="text-xs font-medium text-muted-foreground uppercase">Assigned approver</dt><dd className="mt-0.5">{approval.approver_user_id}</dd></div>
          <div><dt className="text-xs font-medium text-muted-foreground uppercase">Submitted</dt><dd className="mt-0.5">{new Date(approval.created_at).toLocaleString()}</dd></div>
          {approval.resolved_at && <div><dt className="text-xs font-medium text-muted-foreground uppercase">Resolved</dt><dd className="mt-0.5">{new Date(approval.resolved_at).toLocaleString()}</dd></div>}
        </dl>
        {approval.reason && (
          <div className="border-t border-border pt-4">
            <dt className="text-xs font-medium text-muted-foreground uppercase">Reason</dt>
            <dd className="mt-1 text-sm">{approval.reason}</dd>
          </div>
        )}
      </div>

      {approval.agent_recommendation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-5">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">AI Recommendation</h2>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200 capitalize">{approval.agent_recommendation}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">This recommendation is advisory. Final decision is yours.</p>
        </div>
      )}

      {canAct && !isPending && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Your Decision</h2>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for your decision..." rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button onClick={handleApprove} className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors">Approve</button>
              <button onClick={() => setShowRejectForm(true)} className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">Reject</button>
              <button onClick={handleEscalate} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">Escalate</button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Rejection reason</p>
              <input type="text" required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this is being rejected"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" autoFocus />
              <div className="flex gap-3">
                <button onClick={handleReject} disabled={!rejectReason.trim()}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  Confirm rejection
                </button>
                <button onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isPending && <p className="text-sm text-muted-foreground">Saving decision...</p>}

      {isResolved && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This request was <strong>{approval.status}</strong>{" "}
            {approval.resolved_at ? `on ${new Date(approval.resolved_at).toLocaleDateString()}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
