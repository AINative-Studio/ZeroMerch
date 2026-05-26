"use client";

// ---------------------------------------------------------------------------
// Dashboard — Departments (Story 2.3, Issue #8)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { listDepartments, assignManager } from "@/app/actions/departments";
import { listUsers } from "@/app/actions/users";
import type { DepartmentWithStats } from "@/app/actions/departments";
import type { CompanyUser } from "@zeromerch/zerodb";
import Link from "next/link";

// ─── Department row ───────────────────────────────────────────────────────────

function DepartmentRow({
  dept,
  managers,
  onAssignManager,
}: {
  dept: DepartmentWithStats;
  managers: CompanyUser[];
  onAssignManager: (deptId: string, userId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingManager, setEditingManager] = useState(false);
  const [selectedManager, setSelectedManager] = useState<string>(
    dept.manager_user_id ?? ""
  );

  function handleManagerSubmit() {
    if (!selectedManager || selectedManager === dept.manager_user_id) {
      setEditingManager(false);
      return;
    }
    startTransition(async () => {
      await onAssignManager(dept.id, selectedManager);
      setEditingManager(false);
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="py-3 pr-4 text-sm font-medium">{dept.name}</td>
      <td className="py-3 pr-4 text-sm">
        {editingManager ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">No manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
            <button
              onClick={handleManagerSubmit}
              disabled={isPending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSelectedManager(dept.manager_user_id ?? "");
                setEditingManager(false);
              }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingManager(true)}
            title="Click to assign manager"
            className="flex items-center gap-1 group text-left"
          >
            <span>
              {dept.manager
                ? dept.manager.full_name || dept.manager.email
                : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
            </span>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              edit
            </span>
          </button>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {dept.member_count} member{dept.member_count !== 1 ? "s" : ""}
      </td>
      <td className="py-3 text-sm text-muted-foreground">
        {new Date(dept.created_at).toLocaleDateString()}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const { companyId } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [managers, setManagers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    Promise.all([
      listDepartments(companyId),
      listUsers(companyId),
    ]).then(([deptsResult, usersResult]) => {
      if ("error" in deptsResult) {
        setError(deptsResult.error ?? "Failed to load departments");
      } else if (deptsResult.departments) {
        setDepartments(deptsResult.departments);
      }

      if ("users" in usersResult && usersResult.users) {
        // Only show admin/manager-eligible users in manager dropdowns
        setManagers(
          usersResult.users.filter((u) =>
            ["admin", "manager"].includes(u.role) &&
            u.status === "active",
          ),
        );
      }

      setIsLoading(false);
    });
  }, [companyId]);

  async function handleAssignManager(deptId: string, userId: string) {
    const result = await assignManager(deptId, userId);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // Refresh department list to get updated manager info
    if (companyId) {
      const deptsResult = await listDepartments(companyId);
      if (!("error" in deptsResult)) {
        setDepartments(deptsResult.departments);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            {departments.length} department{departments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/departments/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New department
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {departments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No departments yet.</p>
          <Link
            href="/dashboard/departments/new"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create your first department
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Department
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Manager
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Members
                </th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((dept) => (
                <DepartmentRow
                  key={dept.id}
                  dept={dept}
                  managers={managers}
                  onAssignManager={handleAssignManager}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
