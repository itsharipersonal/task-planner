"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PromptsAdminPanel() {
  const [prompts, setPrompts] = useState<Record<string, unknown>[]>([]);
  const [categoryId, setCategoryId] = useState("public-speaking");
  const [promptType, setPromptType] = useState("generation");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/prompts");
    if (res.ok) {
      const data = (await res.json()) as { prompts: Record<string, unknown>[] };
      setPrompts(data.prompts);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, promptType, content }),
    });
    setContent("");
    await load();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">AI Prompts</h1>
      </section>

      <form onSubmit={save} className="grid gap-3 border-2 border-foreground bg-panel p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {Object.keys(CATEGORY_REGISTRY).map((id) => (
                <option key={id} value={id}>{CATEGORY_REGISTRY[id].name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={promptType} onChange={(e) => setPromptType(e.target.value)}>
              <option value="generation">Generation</option>
              <option value="evaluation">Evaluation</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Prompt content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} required />
        </div>
        <Button type="submit">Save new version</Button>
      </form>

      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((p) => (
              <TableRow key={String(p.id)}>
                <TableCell>{String(p.category_id)}</TableCell>
                <TableCell>{String(p.prompt_type)}</TableCell>
                <TableCell>v{String(p.version)}</TableCell>
                <TableCell className="max-w-md truncate">{String(p.content).slice(0, 80)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function NotificationsAdminPanel() {
  const [form, setForm] = useState({
    target: "all",
    role: "user",
    type: "announcement",
    title: "",
    body: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = (await res.json()) as { sent: number };
      setMessage(`Sent to ${data.sent} users.`);
      setForm({ ...form, title: "", body: "" });
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Notifications</h1>
      </section>
      <form onSubmit={send} className="grid max-w-xl gap-3 border-2 border-foreground bg-panel p-4">
        <div>
          <Label>Target</Label>
          <Select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
            <option value="all">Everyone</option>
            <option value="role">By role</option>
            <option value="inactive">Inactive users</option>
          </Select>
        </div>
        {form.target === "role" ? (
          <div>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
        ) : null}
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="challenge">Challenge</option>
            <option value="announcement">Announcement</option>
          </Select>
        </div>
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
        <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></div>
        <Button type="submit">Send</Button>
        {message ? <p className="font-mono text-xs text-phos">{message}</p> : null}
      </form>
    </div>
  );
}

export function AnalyticsAdminPanel() {
  const [tab, setTab] = useState("users");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d as Record<string, unknown>));
  }, []);

  if (!data) return <p className="font-mono text-xs text-dim">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Analytics</h1>
      </section>
      <Tabs
        tabs={[
          { id: "users", label: "Users" },
          { id: "challenges", label: "Challenges" },
          { id: "categories", label: "Categories" },
          { id: "ai", label: "AI" },
          { id: "gamification", label: "Gamification" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <pre className="overflow-auto border-2 border-foreground bg-panel p-4 font-mono text-xs">
        {JSON.stringify(data[tab === "users" ? "users" : tab === "challenges" ? "challenges" : tab === "categories" ? "categories" : tab === "ai" ? "ai" : "gamification"], null, 2)}
      </pre>
    </div>
  );
}

export function SettingsAdminPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = (await res.json()) as { settings: Record<string, string> };
      setSettings(data.settings);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMessage("Settings saved.");
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Settings</h1>
      </section>
      <form onSubmit={save} className="grid max-w-xl gap-3 border-2 border-foreground bg-panel p-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key}>
            <Label>{key.replace(/_/g, " ")}</Label>
            <Input
              value={value}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
            />
          </div>
        ))}
        <Button type="submit">Save settings</Button>
        {message ? <p className="font-mono text-xs text-phos">{message}</p> : null}
      </form>
    </div>
  );
}

export function AuditAdminPanel() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => setLogs((d as { logs: Record<string, unknown>[] }).logs));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Audit Log</h1>
      </section>
      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={String(log.id)}>
                <TableCell>{String(log.admin_name)}</TableCell>
                <TableCell>{String(log.action)}</TableCell>
                <TableCell>{String(log.module)}</TableCell>
                <TableCell>{String(log.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function DailyChallengeAdminPanel() {
  const [daily, setDaily] = useState<Record<string, unknown>[]>([]);
  const [categoryId, setCategoryId] = useState("public-speaking");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/daily");
    if (res.ok) {
      const data = (await res.json()) as { daily: Record<string, unknown>[] };
      setDaily(data.daily);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function generate() {
    await fetch("/api/admin/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", categoryId }),
    });
    await load();
  }

  async function publish(id: string) {
    await fetch("/api/admin/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Daily Challenge</h1>
      </section>
      <div className="flex flex-wrap items-end gap-3 border-2 border-foreground bg-panel p-4">
        <div className="min-w-[200px]">
          <Label>Category</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {Object.keys(CATEGORY_REGISTRY).map((id) => (
              <option key={id} value={id}>{CATEGORY_REGISTRY[id].name}</option>
            ))}
          </Select>
        </div>
        <Button onClick={() => void generate()}>Generate AI Challenge</Button>
      </div>
      <div className="border-2 border-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daily.map((d) => (
              <TableRow key={String(d.id)}>
                <TableCell>{String(d.challenge_date)}</TableCell>
                <TableCell>{String(d.title)}</TableCell>
                <TableCell>{String(d.status)}</TableCell>
                <TableCell>
                  {d.status === "draft" ? (
                    <Button size="sm" onClick={() => void publish(String(d.id))}>Publish</Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
