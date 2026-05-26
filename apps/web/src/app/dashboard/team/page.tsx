"use client";

// ---------------------------------------------------------------------------
// Dashboard — Team Members (Story 2.2, Issue #7)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { listUsers, revokeInvitation, updateUserRole } from "@/app/actions/users";
import type { CompanyUser } from "@zeromerch/zerodb";
import Link from "next/link";

// ─── Role badge colors ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  finance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  employee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vendor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLES = ["admin", "manager", "employee", "finance", "vendor"] as const;

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onRevoke,
  onRoleChange,
}: {
  user: CompanyUser;
  onRevoke: (userId: string) => void;
  onRoleChange: (userId: string, role: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  function handleRoleSubmit() {
    if (selectedRole === user.role) {
      setEditingRole(false);
      return;
    }
    startTransition(async () => {
      await onRoleChange(user.id, selectedRole);
      setEditingRole(false);
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="py-3 pr-4 text-sm">
        <div className="font-medium">{user.full_name || "—"}</div>
        <div className="text-muted-foreground text-xs">{user.email}</div>
      </td>
      <td className="py-3 pr-4">
        {editingRole ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof user.role)}
              className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleRoleSubmit}
              disabled={isPending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSelectedRole(user.role);
                setEditingRole(false);
              }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingRole(true)}
            title="Click to change role"
            className="inline-flex items-center gap-1 group"
          >
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[user.role] ?? ""}`}
            >
              {user.role}
            </span>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              edit
            </span>
          </button>
        )}
      </td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[user.status] ?? ""}`}
        >
          {user.status}
        </span>
        {user.status === "pending" && user.expires_at && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Expires {new Date(user.expires_at).toLocaleDateString()}
          </p>
        )}
      </td>
      <td className="py-3 text-right">
        {(user.status === "pending" || user.status === "active") && (
          <button
            onClick={() => onRevoke(user.id)}
            className="text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Revoke
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { companyId } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    listUsers(companyId).then((result) => {
      if ("error" in result) {
        setError(result.error ?? "Failed to load users");
      } else {
        setUsers(result.users ?? []);
        setTotal(result.total ?? 0);
      }
      setIsLoading(false);
    });
  }, [companyId]);

  function handleRevoke(userId: string) {
    if (!companyId) return;
    startTransition(async () => {
      const result = await revokeInvitation(userId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "revoked" } : u)),
      );
    });
  }

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: result.user.role } : u,
        ),
      );
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            {total} member{total !== 1 ? "s" : ""} in your company
          </p>
        </div>
        <Link
          href="/dashboard/team/invite"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Invite member
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

      {users.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No team members yet.</p>
          <Link
            href="/dashboard/team/invite"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Invite your first member
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onRevoke={handleRevoke}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
