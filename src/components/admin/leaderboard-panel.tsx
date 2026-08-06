"use client";

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

export function LeaderboardAdminPanel() {
  const [scope, setScope] = useState("global");
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/leaderboard?scope=${scope}`);
    if (res.ok) {
      const data = (await res.json()) as { entries: Record<string, unknown>[] };
      setEntries(data.entries);
    }
  }, [scope]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function runAction(action: string) {
    const res = await fetch("/api/admin/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, scope }),
    });
    if (res.ok) {
      setMessage("Action completed.");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Leaderboard</h1>
      </section>

      <Tabs
        tabs={[
          { id: "global", label: "Global" },
          { id: "weekly", label: "Weekly" },
        ]}
        active={scope}
        onChange={setScope}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void runAction("freeze")}>Freeze snapshot</Button>
        <Button variant="outline" size="sm" onClick={() => void runAction("reset_weekly")}>Reset weekly</Button>
      </div>

      {message ? <p className="font-mono text-xs text-phos">{message}</p> : null}

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>User</TableHead>
              <TableHead>XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, i) => (
              <TableRow key={String(e.id)}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{String(e.name)}</TableCell>
                <TableCell>{String(scope === "weekly" ? e.weekly_xp ?? 0 : e.xp)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
