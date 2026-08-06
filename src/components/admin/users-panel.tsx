"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  xp: number;
  coins: number;
  current_streak: number;
  level: number;
  created_at: string;
};

export function UsersAdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = (await res.json()) as { users: UserRow[]; total: number };
      setUsers(data.users);
      setTotal(data.total);
    }
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function updateUser(userId: string, patch: { role?: string; status?: string }) {
    setMessage(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      setMessage("User updated.");
      await load();
    } else {
      setMessage("Update failed.");
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Users</h1>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
          {total} total users
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </Select>
        </div>
      </div>

      {message ? (
        <p className="font-mono text-xs uppercase text-phos">{message}</p>
      ) : null}

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name ?? "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onChange={(e) => void updateUser(u.id, { role: e.target.value })}
                    className="min-w-[120px]"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </Select>
                </TableCell>
                <TableCell>L{u.level}</TableCell>
                <TableCell>{u.xp}</TableCell>
                <TableCell>
                  <Badge variant={u.status === "active" ? "success" : "warning"}>
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-1">
                  <Link href={`/admin/users/${u.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                  {u.status === "active" ? (
                    <Button variant="destructive" size="sm" onClick={() => void updateUser(u.id, { status: "blocked" })}>
                      Block
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => void updateUser(u.id, { status: "active" })}>
                      Unblock
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
