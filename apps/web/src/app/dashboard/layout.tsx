// ---------------------------------------------------------------------------
// Dashboard layout — injects session into AuthProvider
// ---------------------------------------------------------------------------

import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

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
        {/* Dashboard sidebar — Stories 12.1/12.2/12.3 (#46/#47/#48) */}
        <DashboardSidebar />

        {/* Main content area */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </AuthProvider>
  );
}
