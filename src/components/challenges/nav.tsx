"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./notification-bell";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/challenges", label: "Challenges" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export function ChallengeNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <Link
          href="/dashboard"
          className="font-sans text-sm uppercase tracking-tight text-foreground hover:text-hazard"
        >
          Challenge<span className="text-hazard">{" // "}</span>App
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto font-mono text-[0.65rem] uppercase tracking-[0.15em] sm:gap-2 sm:text-xs">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border px-2 py-1 transition-colors ${
                  active
                    ? "border-hazard bg-hazard text-black"
                    : "border-transparent text-dim hover:border-line hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
}
