// ---------------------------------------------------------------------------
// Dashboard layout — injects session into AuthProvider
// ---------------------------------------------------------------------------

import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";

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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dashboard
            </p>
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex-1 p-6">{children}</div>
      </div>
    </AuthProvider>
  );
}
