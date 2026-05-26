"use client";

// ---------------------------------------------------------------------------
// Dashboard — Invite Team Member (Story 2.2, Issue #7)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { inviteUser } from "@/app/actions/users";
import { listDepartments } from "@/app/actions/departments";
import type { DepartmentWithStats } from "@/app/actions/departments";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
  { value: "finance", label: "Finance" },
  { value: "vendor", label: "Vendor" },
] as const;

export default function InviteMemberPage() {
  const { companyId } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("employee");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [fullName, setFullName] = useState("");

  // UI state
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    listDepartments(companyId).then((result) => {
      if (!("error" in result) && result.departments) {
        setDepartments(result.departments);
      }
    });
  }, [companyId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await inviteUser({
        companyId,
        email,
        role,
        departmentId: departmentId || undefined,
        fullName: fullName || undefined,
      });

      if ("error" in result) {
        setError(result.error ?? "Failed to send invitation");
        return;
      }

      setSuccess(`Invitation sent to ${email}`);
      setTimeout(() => router.push("/dashboard/team"), 1500);
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/team"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Team
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Invite member</h1>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium leading-none">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@acme.ai"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            An invitation will be sent and expires in 7 days.
          </p>
        </div>

        {/* Full name (optional) */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium leading-none">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            maxLength={128}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Role */}
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium leading-none">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Admins can manage all settings. Managers oversee departments. Employees and Finance have limited access.
          </p>
        </div>

        {/* Department (optional) */}
        <div className="space-y-2">
          <label htmlFor="department" className="text-sm font-medium leading-none">
            Department
          </label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {departments.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No departments yet.{" "}
              <Link
                href="/dashboard/departments/new"
                className="text-primary hover:underline"
              >
                Create one
              </Link>{" "}
              first.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !email}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Sending..." : "Send invitation"}
          </button>
          <Link
            href="/dashboard/team"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
