"use client";

// ---------------------------------------------------------------------------
// Dashboard Sidebar — navigation for all dashboard sections
// ---------------------------------------------------------------------------

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@zeromerch/auth";

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    section: "AI",
    items: [{ label: "AI Concierge", href: "/dashboard/concierge" }],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/dashboard/products" },
      { label: "Collections", href: "/dashboard/collections" },
    ],
  },
  {
    section: "Campaigns",
    items: [
      { label: "All Campaigns", href: "/dashboard/campaigns" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { label: "Orders", href: "/dashboard/orders" },
      { label: "Redemptions", href: "/dashboard/redemptions" },
      { label: "Inventory", href: "/dashboard/inventory" },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Budgets", href: "/dashboard/budgets" },
    ],
  },
  {
    section: "Analytics",
    items: [
      { label: "Campaign Analytics", href: "/dashboard/analytics/campaigns" },
      { label: "Department Spend", href: "/dashboard/analytics/spend" },
      { label: "AI Insights", href: "/dashboard/analytics/insights" },
    ],
  },
  {
    section: "Admin",
    items: [
      { label: "Team", href: "/dashboard/team" },
      { label: "Departments", href: "/dashboard/departments" },
      { label: "Vendors", href: "/dashboard/vendors" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function DashboardSidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-muted/30 lg:flex lg:flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-bold text-foreground"
        >
          <span className="text-primary">Zero</span>
          <span>Merch</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs font-medium truncate">{user.name ?? user.email}</p>
          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
            {user.role}
          </p>
        </div>
      )}
    </aside>
  );
}
