"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";

type Overview = {
  totals: {
    users: number;
    attempts: number;
    completed: number;
    failed: number;
    avg_score: number | null;
  };
  recentAttempts: {
    id: string;
    title: string;
    category_id: string;
    difficulty: string;
    status: string;
    score: number | null;
    created_at: string;
    user_name: string;
  }[];
  categories: { id: string; enabled: number; attempts: number }[];
};

type Template = {
  id: string;
  category_id: string;
  difficulty: string;
  title: string;
  description: string;
  instructions: string;
  enabled: number;
  created_at: string;
};

const emptyForm = {
  categoryId: "public-speaking",
  difficulty: "medium",
  title: "",
  description: "",
  instructions: "",
};

export function AdminPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [ovRes, tplRes] = await Promise.all([
      fetch("/api/admin/overview"),
      fetch("/api/admin/templates"),
    ]);
    if (ovRes.ok) setOverview((await ovRes.json()) as Overview);
    if (tplRes.ok) {
      const data = (await tplRes.json()) as { templates: Template[] };
      setTemplates(data.templates);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  async function toggleCategory(id: string, enabled: boolean) {
    await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  async function createTemplate(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setForm(emptyForm);
      setMessage("Template created.");
      await load();
    } else {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Failed to create template.");
    }
  }

  async function toggleTemplate(id: string, enabled: boolean) {
    await fetch(`/api/admin/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm("Delete this template?")) return;
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    await load();
  }

  async function overrideScore(attemptId: string) {
    const value = Number(overrides[attemptId]);
    if (Number.isNaN(value)) return;
    const response = await fetch(`/api/admin/attempts/${attemptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: value }),
    });
    setMessage(response.ok ? `Score overridden to ${value}.` : "Override failed.");
    await load();
  }

  return (
    <div className="space-y-8">
      {overview ? (
        <section className="grid grid-cols-2 gap-1 bg-line p-[1px] sm:grid-cols-5">
          <AdminStat label="Users" value={overview.totals.users} />
          <AdminStat label="Attempts" value={overview.totals.attempts} />
          <AdminStat label="Completed" value={overview.totals.completed} />
          <AdminStat label="Failed" value={overview.totals.failed} />
          <AdminStat label="Avg score" value={overview.totals.avg_score ?? 0} />
        </section>
      ) : null}

      {message ? (
        <p className="border border-phos px-3 py-2 font-mono text-xs uppercase tracking-[0.15em] text-phos">
          &gt; {message}
        </p>
      ) : null}

      <section>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          [ Category control ]
        </p>
        <div className="grid gap-1 bg-line p-[1px] sm:grid-cols-2 lg:grid-cols-3">
          {(overview?.categories ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 bg-paper px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs uppercase text-foreground">
                  {CATEGORY_REGISTRY[c.id]?.name ?? c.id}
                </p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                  {c.attempts} ATTEMPTS
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleCategory(c.id, c.enabled !== 1)}
                className={`border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] ${
                  c.enabled === 1
                    ? "border-phos text-phos"
                    : "border-hazard text-hazard"
                }`}
              >
                {c.enabled === 1 ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          [ Challenge templates — used when AI generation is unavailable ]
        </p>
        <form onSubmit={createTemplate} className="space-y-2 border-2 border-line bg-panel px-4 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="border-2 border-line bg-paper px-3 py-2 font-mono text-xs uppercase text-foreground outline-none focus:border-foreground"
            >
              {Object.values(CATEGORY_REGISTRY).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              className="border-2 border-line bg-paper px-3 py-2 font-mono text-xs uppercase text-foreground outline-none focus:border-foreground"
            >
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
            </select>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="TITLE"
            className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="DESCRIPTION"
            rows={2}
            className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
          />
          <textarea
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            placeholder="INSTRUCTIONS"
            rows={3}
            className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
          />
          <button
            type="submit"
            className="border-2 border-foreground bg-background px-4 py-2 font-sans text-sm uppercase tracking-wide text-foreground transition-colors hover:border-hazard hover:bg-hazard hover:text-black"
          >
            [ CREATE TEMPLATE ]
          </button>
        </form>

        {templates.length > 0 ? (
          <ul className="mt-2 grid gap-1 bg-line p-[1px]">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-3 bg-paper px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs uppercase text-foreground">{t.title}</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                    {CATEGORY_REGISTRY[t.category_id]?.name ?? t.category_id} / {t.difficulty}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleTemplate(t.id, t.enabled !== 1)}
                  className={`border px-2 py-1 font-mono text-[0.6rem] uppercase ${
                    t.enabled === 1 ? "border-phos text-phos" : "border-line text-dim"
                  }`}
                >
                  {t.enabled === 1 ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTemplate(t.id)}
                  className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim hover:text-hazard"
                >
                  [DEL]
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          [ Recent submissions — review &amp; override scores ]
        </p>
        <ul className="grid gap-1 bg-line p-[1px]">
          {(overview?.recentAttempts ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 bg-paper px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs uppercase text-foreground">{a.title}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                  {a.user_name} · {a.category_id}/{a.difficulty} · {a.status}
                  {a.score !== null ? ` · SCORE ${a.score}` : ""}
                </p>
              </div>
              {a.status === "completed" ? (
                <div className="flex items-center gap-1">
                  <input
                    value={overrides[a.id] ?? ""}
                    onChange={(e) =>
                      setOverrides((o) => ({ ...o, [a.id]: e.target.value }))
                    }
                    placeholder="0-100"
                    inputMode="numeric"
                    className="w-16 border border-line bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => void overrideScore(a.id)}
                    className="border border-line px-2 py-1 font-mono text-[0.6rem] uppercase text-dim hover:border-hazard hover:text-hazard"
                  >
                    SET
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper px-4 py-3">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">{label}</p>
      <p className="mt-1 font-sans text-2xl text-foreground">{value}</p>
    </div>
  );
}
