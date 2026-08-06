"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  coins: number;
  enabled: number;
  visibility: string;
};

export function BadgesAdminPanel() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [form, setForm] = useState({ id: "", name: "", description: "", icon: "★" });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/badges");
    if (res.ok) {
      const data = (await res.json()) as { badges: Badge[] };
      setBadges(data.badges);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/admin/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ id: "", name: "", description: "", icon: "★" });
    await load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/badges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Badges</h1>
      </section>

      <form onSubmit={create} className="grid gap-3 border-2 border-foreground bg-panel p-4 md:grid-cols-2">
        <div><Label>ID</Label><Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required /></div>
        <div><Label>Icon</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button type="submit" className="md:col-span-2">Create Badge</Button>
      </form>

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.icon}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.description}</TableCell>
                <TableCell>
                  <Switch checked={b.enabled === 1} onCheckedChange={(v) => void toggle(b.id, v)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
