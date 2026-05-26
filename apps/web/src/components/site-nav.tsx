"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

const navLinks = [
  { href: "/store", label: "Store" },
  { href: "/admin", label: "Admin" },
];

export function SiteNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-foreground"
          aria-label="ZeroMerch home"
        >
          <span className="text-primary">Zero</span>
          <span>Merch</span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-6">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth slot — wired in Batch B */}
        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
