"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Category = {
  id: string;
  name: string;
  slug: string;
  glyph: string;
  enabled: boolean;
  sortOrder: number;
  description: string | null;
};

export function CategoriesAdminPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = (await res.json()) as { categories: Category[] };
      setCategories(data.categories);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  async function save(id: string) {
    await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        icon: form.icon,
      }),
    });
    setEditing(null);
    await load();
  }

  function startEdit(cat: Category) {
    setEditing(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "", icon: cat.glyph });
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Categories</h1>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
          Display fields editable · timers/rubrics in registry
        </p>
      </section>

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>{cat.glyph}</TableCell>
                <TableCell>
                  {editing === cat.id ? (
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  ) : (
                    cat.name
                  )}
                </TableCell>
                <TableCell>{cat.slug}</TableCell>
                <TableCell>
                  <Switch checked={cat.enabled} onCheckedChange={(v) => void toggle(cat.id, v)} />
                </TableCell>
                <TableCell className="space-x-1">
                  {editing === cat.id ? (
                    <Button size="sm" onClick={() => void save(cat.id)}>Save</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => startEdit(cat)}>Edit</Button>
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
