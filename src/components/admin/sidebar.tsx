"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/admin";
import { isRoleAtLeast } from "@/lib/admin/permissions";

type NavItem = { href: string; label: string; minRole?: UserRole };

type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "Challenges",
    items: [
      { href: "/admin/categories", label: "Categories", minRole: "admin" },
      { href: "/admin/templates", label: "Templates", minRole: "admin" },
      { href: "/admin/templates/daily", label: "Daily Challenge", minRole: "admin" },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/users", label: "Users", minRole: "moderator" },
      { href: "/admin/attempts", label: "Attempts", minRole: "moderator" },
      { href: "/admin/reviews", label: "Reviews", minRole: "moderator" },
    ],
  },
  {
    title: "Gamification",
    items: [
      { href: "/admin/badges", label: "Badges", minRole: "admin" },
      { href: "/admin/leaderboard", label: "Leaderboard", minRole: "admin" },
    ],
  },
  {
    title: "AI",
    items: [{ href: "/admin/prompts", label: "Prompts", minRole: "admin" }],
  },
  {
    title: "System",
    items: [
      { href: "/admin/analytics", label: "Analytics", minRole: "admin" },
      { href: "/admin/notifications", label: "Notifications", minRole: "admin" },
      { href: "/admin/settings", label: "Settings", minRole: "super_admin" },
      { href: "/admin/settings/audit", label: "Audit Log", minRole: "super_admin" },
    ],
  },
];

export function AdminSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r-2 border-foreground bg-panel">
      <div className="border-b-2 border-foreground px-4 py-4">
        <Link href="/admin" className="font-sans text-lg uppercase tracking-tight">
          Forge<span className="text-hazard"> // </span>Admin
        </Link>
        <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-dim">
          Control system
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group) => {
          const items = group.items.filter(
            (item) => !item.minRole || isRoleAtLeast(role, item.minRole),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <p className="px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-dim">
                {group.title}
              </p>
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors ${
                      active
                        ? "bg-hazard text-black"
                        : "text-dim hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t-2 border-foreground px-4 py-3">
        <Link
          href="/dashboard"
          className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim hover:text-hazard"
        >
          ← Back to app
        </Link>
      </div>
    </aside>
  );
}
