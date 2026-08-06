"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Attempt = {
  id: string;
  user_name: string;
  title: string;
  category_id: string;
  difficulty: string;
  status: string;
  score: number | null;
  created_at: string;
};

export function AttemptsAdminPanel({ defaultStatus }: { defaultStatus?: string }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState(defaultStatus ?? "");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/attempts?${params}`);
    if (res.ok) {
      const data = (await res.json()) as { attempts: Attempt[] };
      setAttempts(data.attempts);
    }
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Attempts</h1>
      </section>

      <div className="max-w-xs">
        <Label>Filter by status</Label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="submitted">Submitted</option>
          <option value="evaluating">Evaluating</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="active">Active</option>
        </Select>
      </div>

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
            {attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.user_name}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{a.category_id}</TableCell>
                <TableCell>
                  <Badge>{a.status}</Badge>
                </TableCell>
                <TableCell>{a.score ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReviewsAdminPanel() {
  const [queue, setQueue] = useState<
    { attempt: Record<string, unknown>; submission: Record<string, unknown> | null; feedback: Record<string, unknown> | null }[]
  >([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [detail, setDetail] = useState<{
    attempt: Record<string, unknown>;
    submission: Record<string, unknown> | null;
    feedback: Record<string, unknown> | null;
  } | null>(null);

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/admin/attempts?status=submitted&limit=25");
    if (res.ok) {
      const data = (await res.json()) as { attempts: Record<string, unknown>[] };
      setQueue(data.attempts.map((a) => ({ attempt: a, submission: null, feedback: null })));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadQueue(), 0);
    return () => clearTimeout(t);
  }, [loadQueue]);

  async function loadDetail(id: string) {
    setSelected(id);
    const res = await fetch(`/api/admin/attempts/${id}`);
    if (res.ok) setDetail((await res.json()) as typeof detail);
  }

  async function submitReview() {
    if (!selected || !score) return;
    await fetch(`/api/admin/attempts/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: Number(score), notes }),
    });
    setScore("");
    setNotes("");
    setDetail(null);
    setSelected(null);
    await loadQueue();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-sans text-4xl uppercase tracking-tight">Reviews</h1>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
          Manual review queue
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>User</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={String(item.attempt.id)}>
                  <TableCell>{String(item.attempt.title)}</TableCell>
                  <TableCell>{String(item.attempt.user_name)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => void loadDetail(String(item.attempt.id))}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {detail ? (
          <div className="space-y-3 border-2 border-hazard bg-panel p-4">
            <h2 className="font-sans text-lg uppercase">{String(detail.attempt.title)}</h2>
            {detail.submission ? (
              <div className="space-y-2">
                <p className="font-mono text-[0.6rem] uppercase text-dim">
                  Submission ({String(detail.submission.kind)})
                </p>
                {detail.submission.kind === "video" || detail.submission.kind === "audio" ? (
                  detail.submission.content?.toString().startsWith("data:") ? (
                    detail.submission.kind === "video" ? (
                      <video controls className="max-w-full border-2 border-foreground" src={String(detail.submission.content)} />
                    ) : (
                      <audio controls src={String(detail.submission.content)} />
                    )
                  ) : (
                    <p className="font-mono text-xs">{String(detail.submission.content).slice(0, 500)}</p>
                  )
                ) : (
                  <pre className="max-h-48 overflow-auto border border-line bg-background p-2 font-mono text-xs whitespace-pre-wrap">
                    {String(detail.submission.content)}
                  </pre>
                )}
              </div>
            ) : (
              <p className="font-mono text-xs text-dim">No submission loaded.</p>
            )}
            <div>
              <Label>Override score (0-100)</Label>
              <Input value={score} onChange={(e) => setScore(e.target.value)} type="number" min={0} max={100} />
            </div>
            <div>
              <Label>Admin notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={() => void submitReview()}>Save review</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
