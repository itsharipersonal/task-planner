"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Template = {
  id: string;
  category_id: string;
  difficulty: string;
  title: string;
  description: string;
  instructions: string;
  enabled: number;
};

const emptyForm = {
  categoryId: "public-speaking",
  difficulty: "medium",
  title: "",
  description: "",
  instructions: "",
};

export function TemplatesAdminPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Template | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/templates");
    if (res.ok) {
      const data = (await res.json()) as { templates: Template[] };
      setTemplates(data.templates);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    await load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/admin/templates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        description: editing.description,
        instructions: editing.instructions,
      }),
    });
    setEditing(null);
    await load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    await load();
  }

  async function duplicate(tpl: Template) {
    await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: tpl.category_id,
        difficulty: tpl.difficulty,
        title: `${tpl.title} (copy)`,
        description: tpl.description,
        instructions: tpl.instructions,
      }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Templates</h1>
      </section>

      <form onSubmit={create} className="grid gap-3 border-2 border-foreground bg-panel p-4 md:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {Object.keys(CATEGORY_REGISTRY).map((id) => (
              <option key={id} value={id}>{CATEGORY_REGISTRY[id].name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Difficulty</Label>
          <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="md:col-span-2">
          <Label>Instructions</Label>
          <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} required />
        </div>
        <Button type="submit" className="md:col-span-2">Create Template</Button>
      </form>

      {editing ? (
        <div className="space-y-3 border-2 border-hazard bg-panel p-4">
          <h2 className="font-sans text-lg uppercase">Edit Template</h2>
          <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <Textarea value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={() => void saveEdit()}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tpl) => (
              <TableRow key={tpl.id}>
                <TableCell>{tpl.title}</TableCell>
                <TableCell>{tpl.category_id}</TableCell>
                <TableCell>{tpl.difficulty}</TableCell>
                <TableCell>
                  <Switch checked={tpl.enabled === 1} onCheckedChange={(v) => void toggle(tpl.id, v)} />
                </TableCell>
                <TableCell className="space-x-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(tpl)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => void duplicate(tpl)}>Duplicate</Button>
                  <Button variant="destructive" size="sm" onClick={() => void remove(tpl.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
