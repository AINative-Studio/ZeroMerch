"use client";

// ---------------------------------------------------------------------------
// Dashboard home — shows authenticated user info
// ---------------------------------------------------------------------------

import { useAuth } from "@zeromerch/auth";

export default function DashboardPage() {
  const { user, isLoading, companyId } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email ?? "user"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Role</p>
          <p className="mt-1 text-lg font-semibold capitalize">
            {user?.role ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Company</p>
          <p className="mt-1 text-lg font-semibold">{companyId ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Department
          </p>
          <p className="mt-1 text-lg font-semibold">
            {user?.department_id ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
