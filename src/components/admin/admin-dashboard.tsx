"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardData = {
  totals: {
    users: number;
    active_today: number;
    completed: number;
    avg_score: number | null;
    xp_today: number;
    coins_today: number;
    active_challenges: number;
    pending_reviews: number;
  };
  charts: {
    dau: { day: string; count: number }[];
    completion: { status: string; count: number }[];
    xpDistribution: { bucket: string; count: number }[];
    topCategories: { category_id: string; count: number }[];
    userGrowth: { month: string; count: number }[];
  };
  recentAttempts: {
    id: string;
    title: string;
    category_id: string;
    difficulty: string;
    status: string;
    score: number | null;
    user_name: string;
  }[];
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard");
    if (res.ok) setData((await res.json()) as DashboardData);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!data) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-dim">
        Loading dashboard...
      </p>
    );
  }

  const { totals, charts, recentAttempts } = data;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Dashboard</h1>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
          Platform overview
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={totals.users} />
        <StatCard label="Active Today" value={totals.active_today} />
        <StatCard label="Completed" value={totals.completed} />
        <StatCard
          label="Average Score"
          value={totals.avg_score ?? "—"}
        />
        <StatCard label="XP Today" value={totals.xp_today} />
        <StatCard label="Coins Today" value={totals.coins_today} />
        <StatCard label="Active Challenges" value={totals.active_challenges} />
        <StatCard label="Pending Reviews" value={totals.pending_reviews} />
      </div>

      <DashboardCharts {...charts} />

      <section>
        <h2 className="mb-3 font-sans text-xl uppercase tracking-tight">
          Recent Attempts
        </h2>
        <div className="border-2 border-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.user_name}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.category_id}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "completed" ? "success" : "default"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.score ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
