// ---------------------------------------------------------------------------
// Dashboard layout — injects session into AuthProvider
// ---------------------------------------------------------------------------

import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Double-check: middleware should have caught this, but defense in depth
  if (!session) {
    redirect("/login");
  }

  return (
    <AuthProvider initialUser={session.user} initialToken={session.token}>
      <div className="flex min-h-[calc(100vh-8rem)]">
        {/* Sidebar placeholder — will be built in a later batch */}
        <aside className="hidden w-64 border-r border-border bg-muted/50 lg:block">
          <nav className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Dashboard
            </p>
            <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Overview
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1 px-3">
              Catalog
            </p>
            <Link href="/dashboard/products" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/dashboard/products/search" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Product Search
            </Link>
            <Link href="/dashboard/collections" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Collections
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1 px-3">
              Workspace
            </p>
            <Link href="/dashboard/brand" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Brand Kit
            </Link>
            <Link href="/dashboard/team" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Team
            </Link>
            <Link href="/dashboard/departments" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Departments
            </Link>
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex-1 p-6">{children}</div>
      </div>
    </AuthProvider>
  );
}
