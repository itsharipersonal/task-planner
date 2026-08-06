"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: Notification[] };
      if (!cancelled) setItems(data.notifications);
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch("/api/notifications", { method: "POST" });
      setItems((current) => current.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label="Notifications"
        className={`border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] transition-colors sm:text-xs ${
          unread > 0
            ? "border-hazard text-hazard"
            : "border-transparent text-dim hover:border-line hover:text-foreground"
        }`}
      >
        SIG{unread > 0 ? `[${unread}]` : ""}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 border-2 border-foreground bg-panel">
          <div className="border-b-2 border-foreground bg-hazard px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-black">
            {"// Signal feed"}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-xs uppercase tracking-[0.15em] text-dim">
                [ No signals ]
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line px-3 py-2 hover:bg-paper"
                >
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-hazard">
                    {n.title}
                  </p>
                  <p className="mt-1 font-mono text-xs text-foreground">{n.body}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
