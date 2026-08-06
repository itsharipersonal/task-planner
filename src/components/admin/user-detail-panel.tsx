"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserDetail = {
  user: Record<string, unknown>;
  attempts: Record<string, unknown>[];
  xpHistory: Record<string, unknown>[];
  badges: Record<string, unknown>[];
};

export function UserDetailPanel({ userId }: { userId: string }) {
  const [tab, setTab] = useState("progress");
  const [data, setData] = useState<UserDetail | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}`);
    if (res.ok) setData((await res.json()) as UserDetail);
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function runAction(action: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  if (!data) {
    return <p className="font-mono text-xs text-dim">Loading...</p>;
  }

  const u = data.user;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="font-mono text-[0.6rem] uppercase text-dim hover:text-hazard">
            ← Users
          </Link>
          <h1 className="mt-2 font-sans text-3xl uppercase">{String(u.name ?? u.email)}</h1>
          <p className="font-mono text-xs text-dim">{String(u.email)} · {String(u.role)} · {String(u.status)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void runAction("reset_xp")}>Reset XP</Button>
          <Button variant="outline" size="sm" onClick={() => void runAction("reset_coins")}>Reset Coins</Button>
          <Button variant="outline" size="sm" onClick={() => void runAction("reset_streak")}>Reset Streak</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Level" value={`L${u.level}`} />
        <Stat label="XP" value={String(u.xp)} />
        <Stat label="Coins" value={String(u.coins)} />
        <Stat label="Streak" value={String(u.current_streak)} />
      </div>

      <Tabs
        tabs={[
          { id: "progress", label: "Progress" },
          { id: "attempts", label: "Attempts" },
          { id: "xp", label: "XP History" },
          { id: "badges", label: "Badges" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "attempts" ? (
        <DataTable
          headers={["Title", "Category", "Status", "Score"]}
          rows={data.attempts.map((a) => [a.title, a.category_id, a.status, a.score ?? "—"])}
        />
      ) : null}
      {tab === "xp" ? (
        <DataTable
          headers={["Amount", "Reason", "Date"]}
          rows={data.xpHistory.map((x) => [x.amount, x.reason, x.created_at])}
        />
      ) : null}
      {tab === "badges" ? (
        <DataTable
          headers={["Badge", "Earned"]}
          rows={data.badges.map((b) => [b.badge_id, b.earned_at])}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-foreground bg-panel px-3 py-2">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-dim">{label}</p>
      <p className="font-sans text-2xl uppercase">{value}</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  return (
    <div className="border-2 border-foreground">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{String(cell)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
