"use client";

// ---------------------------------------------------------------------------
// Dashboard - Audit Log Viewer (Story 13.1, Issue #50)
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import type { AuditEvent, AuditActorType, AuditEventType } from "@zeromerch/audit";

interface Filters {
  event_type: string;
  actor_type: string;
  from: string;
  to: string;
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({ event_type: "", actor_type: "", from: "", to: "" });
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.event_type) params.set("event_type", filters.event_type);
      if (filters.actor_type) params.set("actor_type", filters.actor_type);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`/api/audit/export?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { events: AuditEvent[] };
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <button
          onClick={handleExportJSON}
          disabled={events.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
        >
          Export JSON
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <select
          value={filters.event_type}
          onChange={(e) => setFilters((f) => ({ ...f, event_type: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All event types</option>
          <option value="campaign.published">campaign.published</option>
          <option value="order.created">order.created</option>
          <option value="order.paid">order.paid</option>
          <option value="redemption_link.used">redemption_link.used</option>
          <option value="approval.created">approval.created</option>
          <option value="approval.resolved">approval.resolved</option>
          <option value="gdpr.user_deleted">gdpr.user_deleted</option>
        </select>
        <select
          value={filters.actor_type}
          onChange={(e) => setFilters((f) => ({ ...f, actor_type: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All actors</option>
          <option value="user">user</option>
          <option value="agent">agent</option>
          <option value="system">system</option>
          <option value="webhook">webhook</option>
        </select>
        <input
          type="datetime-local"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm"
          placeholder="From"
        />
        <input
          type="datetime-local"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="border rounded-md px-3 py-2 text-sm"
          placeholder="To"
        />
      </div>

      <button
        onClick={() => { void fetchEvents(); }}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"
      >
        {loading ? "Loading..." : "Search"}
      </button>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Timestamp</th>
                <th className="text-left p-3 font-medium">Event Type</th>
                <th className="text-left p-3 font-medium">Actor</th>
                <th className="text-left p-3 font-medium">Object</th>
                <th className="text-left p-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b hover:bg-muted/25">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-xs">{ev.event_type}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-xs bg-muted rounded px-1">{ev.actor_type}</span>
                      <span className="text-muted-foreground truncate max-w-[100px]">{ev.actor_id}</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {ev.object_type}/{ev.object_id?.slice(0, 8)}...
                  </td>
                  <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">
                    {ev.payload ? JSON.stringify(ev.payload).slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">{events.length} events</p>
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="text-muted-foreground text-sm">No events found. Use the filters above and click Search.</p>
      )}
    </div>
  );
}
