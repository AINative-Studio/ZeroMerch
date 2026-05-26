"use client";

// ---------------------------------------------------------------------------
// Dashboard — Create Department (Story 2.3, Issue #8)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { createDepartment } from "@/app/actions/departments";
import { listUsers } from "@/app/actions/users";
import type { CompanyUser } from "@zeromerch/zerodb";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewDepartmentPage() {
  const { companyId } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState("");
  const [managerUserId, setManagerUserId] = useState<string>("");

  // UI state
  const [eligibleManagers, setEligibleManagers] = useState<CompanyUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    listUsers(companyId).then((result) => {
      if ("users" in result && result.users) {
        // Only admin and manager roles can be assigned as department manager
        setEligibleManagers(
          result.users.filter(
            (u) =>
              ["admin", "manager"].includes(u.role) && u.status === "active",
          ),
        );
      }
    });
  }, [companyId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setError(null);

    startTransition(async () => {
      const result = await createDepartment({
        companyId,
        name,
        managerUserId: managerUserId || undefined,
      });

      if ("error" in result) {
        setError(result.error ?? "Failed to create department");
        return;
      }

      router.push("/dashboard/departments");
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/departments"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Departments
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">New department</h1>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Department name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium leading-none">
            Department name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={128}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Manager selector */}
        <div className="space-y-2">
          <label htmlFor="manager" className="text-sm font-medium leading-none">
            Manager
          </label>
          <select
            id="manager"
            value={managerUserId}
            onChange={(e) => setManagerUserId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Assign later</option>
            {eligibleManagers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.role})
              </option>
            ))}
          </select>
          {eligibleManagers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No eligible managers found. Invite an admin or manager first.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Only users with admin or manager roles can be assigned as department manager.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create department"}
          </button>
          <Link
            href="/dashboard/departments"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
