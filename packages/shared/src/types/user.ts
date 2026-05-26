export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan: "starter" | "growth" | "enterprise";
  createdAt: string;
}
