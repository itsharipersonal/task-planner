"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import type { Task } from "@/lib/tasks";

type TaskBoardProps = {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userImage: string | null | undefined;
};

export function TaskBoard({ userName, userEmail, userImage }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        if (!cancelled) setError("Could not load tasks.");
        if (!cancelled) setLoading(false);
        return;
      }
      const data = (await response.json()) as { tasks: Task[] };
      if (!cancelled) {
        setTasks(data.tasks);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });

    if (!response.ok) {
      setError("Could not create task.");
      setSubmitting(false);
      return;
    }

    const data = (await response.json()) as { task: Task };
    setTasks((current) => [data.task, ...current]);
    setTitle("");
    setSubmitting(false);
  }

  async function toggleTask(task: Task) {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { task: Task };
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? data.task : item)),
    );
  }

  async function deleteTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!response.ok) return;
    setTasks((current) => current.filter((item) => item.id !== taskId));
  }

  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = totalCount - completedCount;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="grid grid-cols-1 gap-1 bg-line p-[1px] sm:grid-cols-3">
        <div className="flex items-center gap-3 bg-paper px-4 py-3">
          {userImage ? (
            <img
              src={userImage}
              alt=""
              className="h-10 w-10 border-2 border-foreground bg-panel object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-panel font-sans text-sm text-foreground">
              {(userName ?? userEmail ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 font-mono text-xs uppercase tracking-[0.12em]">
            <p className="truncate text-foreground">
              Operator / {userName ?? "Unknown"}
            </p>
            <p className="truncate text-dim">{userEmail}</p>
          </div>
        </div>
        <div className="hidden flex-col justify-center bg-paper px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] text-dim sm:flex">
          <span>Unit / D-01</span>
          <span>Reg / v0.1.0</span>
        </div>
        <div className="flex items-center justify-between bg-paper px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] sm:justify-end sm:gap-6">
          <span className="text-dim">Status</span>
          <span className="flex items-center gap-2 text-phos">
            <span className="terminal-blink">▮</span>
            Online
          </span>
        </div>
      </header>

      <section className="border-y-2 border-foreground py-10">
        <h1 className="font-sans text-[clamp(3.5rem,12vw,9rem)] uppercase leading-[0.85] tracking-[-0.04em]">
          Task <span className="text-hazard">Register</span>
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          &gt; Private register. Bound to operator credentials. Clearance:
          owner.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-dim">
          <span>{"[ New entry ]"}</span>
          <span>+</span>
        </div>
        <form
          onSubmit={addTask}
          className="grid grid-cols-[1fr_auto] gap-1 bg-line p-[1px]"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="PROGRAM TASK DESIGNATION..."
            spellCheck={false}
            autoComplete="off"
            className="bg-paper px-4 py-3 font-mono text-sm uppercase tracking-[0.08em] outline-none placeholder:text-dim/60 focus:bg-panel"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-hazard px-6 font-sans text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {submitting ? "[...]" : "[Add]"}
          </button>
        </form>
      </section>

      {error ? (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-hazard">
          &gt; {error}
        </p>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-dim">
          <span>{"[ Active tasks ]"}</span>
          <span>{String(totalCount).padStart(3, "0")}</span>
        </div>

        {loading ? (
          <p className="border border-line bg-paper px-4 py-8 text-center font-mono text-sm uppercase tracking-[0.2em] text-dim">
            <span className="terminal-blink">&gt;</span> Loading register...
          </p>
        ) : totalCount === 0 ? (
          <p className="border-2 border-dashed border-line px-4 py-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-dim">
            {"[ EMPTY REGISTER // LOG ADDITIONAL ENTRIES ]"}
          </p>
        ) : (
          <ul className="grid gap-1 bg-line p-[1px]">
            {tasks.map((task, index) => (
              <li
                key={task.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-paper px-4 py-3"
              >
                <button
                  type="button"
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  onClick={() => void toggleTask(task)}
                  className={`font-mono text-base tracking-[0.1em] ${
                    task.completed
                      ? "text-hazard"
                      : "border border-foreground px-1 text-foreground hover:border-hazard hover:text-hazard"
                  }`}
                >
                  {task.completed ? "[X]" : "[ ]"}
                </button>
                <div className="min-w-0">
                  <p
                    className={`truncate font-mono text-sm uppercase tracking-[0.05em] ${
                      task.completed
                        ? "text-dim line-through decoration-hazard decoration-2"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">
                    Entry / {String(index + 1).padStart(3, "0")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteTask(task.id)}
                  className="font-mono text-xs uppercase tracking-[0.15em] text-dim transition-colors hover:text-hazard"
                >
                  [Delete]
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="grid grid-cols-3 gap-1 bg-line p-[1px]">
        <div className="bg-paper px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
          <p className="text-dim">Total</p>
          <p className="mt-1 text-foreground">
            {String(totalCount).padStart(3, "0")}
          </p>
        </div>
        <div className="bg-paper px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
          <p className="text-dim">Active</p>
          <p className="mt-1 text-foreground">
            {String(activeCount).padStart(3, "0")}
          </p>
        </div>
        <div className="bg-paper px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
          <p className="text-dim">Cleared</p>
          <p className={`mt-1 ${completedCount > 0 ? "text-hazard" : "text-foreground"}`}>
            {String(completedCount).padStart(3, "0")}
          </p>
        </div>
      </footer>
    </div>
  );
}