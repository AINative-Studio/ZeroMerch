"use client";

// ---------------------------------------------------------------------------
// Dashboard - GDPR Request Management (Story 13.2, Issue #51)
// ---------------------------------------------------------------------------

import { useState } from "react";

interface RequestRecord {
  type: "export" | "deletion";
  userId: string;
  timestamp: string;
  status: "pending" | "complete" | "error";
  error?: string;
}

export default function GDPRPage() {
  const [adminUserId, setAdminUserId] = useState("");
  const [history, setHistory] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState<"export" | "deletion" | "self-export" | null>(null);

  async function handleSelfExport() {
    setLoading("self-export");
    try {
      const res = await fetch("/api/gdpr/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { data: unknown };
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleAdminExport() {
    if (!adminUserId.trim()) { alert("Enter a user ID"); return; }
    setLoading("export");
    const record: RequestRecord = { type: "export", userId: adminUserId, timestamp: new Date().toISOString(), status: "pending" };
    setHistory((h) => [record, ...h]);
    try {
      const res = await fetch("/api/gdpr/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: adminUserId }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { data: unknown };
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-data-${adminUserId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setHistory((h) => h.map((r) => r === record ? { ...r, status: "complete" } : r));
    } catch (err) {
      setHistory((h) => h.map((r) => r === record ? { ...r, status: "error", error: err instanceof Error ? err.message : "Failed" } : r));
    } finally {
      setLoading(null);
    }
  }

  async function handleDeletion() {
    if (!adminUserId.trim()) { alert("Enter a user ID"); return; }
    if (!confirm(`Permanently anonymize data for user ${adminUserId}? This cannot be undone.`)) return;
    setLoading("deletion");
    const record: RequestRecord = { type: "deletion", userId: adminUserId, timestamp: new Date().toISOString(), status: "pending" };
    setHistory((h) => [record, ...h]);
    try {
      const res = await fetch("/api/gdpr/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: adminUserId }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHistory((h) => h.map((r) => r === record ? { ...r, status: "complete" } : r));
      setAdminUserId("");
    } catch (err) {
      setHistory((h) => h.map((r) => r === record ? { ...r, status: "error", error: err instanceof Error ? err.message : "Failed" } : r));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">GDPR &amp; Privacy Management</h1>

      {/* Self-service section */}
      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Your Data</h2>
        <p className="text-sm text-muted-foreground mb-4">Download a copy of all data ZeroMerch holds about you.</p>
        <button
          onClick={() => { void handleSelfExport(); }}
          disabled={loading === "self-export"}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
        >
          {loading === "self-export" ? "Preparing..." : "Download My Data"}
        </button>
      </section>

      {/* Admin section */}
      <section className="p-4 border rounded-lg mb-8">
        <h2 className="text-lg font-semibold mb-1">Admin: User Data Management</h2>
        <p className="text-xs text-muted-foreground mb-4">Requires admin or company_admin role.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="User ID"
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm flex-1"
          />
          <button
            onClick={() => { void handleAdminExport(); }}
            disabled={loading === "export"}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm disabled:opacity-50"
          >
            {loading === "export" ? "Exporting..." : "Export"}
          </button>
          <button
            onClick={() => { void handleDeletion(); }}
            disabled={loading === "deletion"}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm disabled:opacity-50"
          >
            {loading === "deletion" ? "Processing..." : "Process Deletion"}
          </button>
        </div>
      </section>

      {/* Request history */}
      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Request History</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">User ID</th>
                <th className="text-left p-3 font-medium">Timestamp</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.type === "deletion" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.userId.slice(0, 16)}...</td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-xs ${r.status === "complete" ? "text-green-600" : r.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {r.status}{r.error ? `: ${r.error}` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
