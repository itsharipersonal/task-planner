"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type CountdownProps = {
  /** Absolute deadline in server ms. */
  endsAt: number;
  /** serverNow - clientNow, so the clock can't be cheated by skewing. */
  clockOffset: number;
  onExpire?: () => void;
  className?: string;
};

export function Countdown({ endsAt, clockOffset, onExpire, className }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => endsAt - (Date.now() + clockOffset));

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = endsAt - (Date.now() + clockOffset);
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt, clockOffset, onExpire]);

  const urgent = remaining <= 30_000;
  return (
    <span
      className={`font-mono tabular-nums tracking-[0.1em] ${
        urgent ? "text-hazard" : "text-phos"
      } ${remaining <= 10_000 ? "terminal-blink" : ""} ${className ?? ""}`}
    >
      {format(remaining)}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "phos",
}: {
  value: number;
  max: number;
  tone?: "phos" | "hazard" | "foreground";
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color =
    tone === "hazard"
      ? "bg-hazard"
      : tone === "foreground"
        ? "bg-foreground"
        : "bg-phos";
  return (
    <div className="h-2 w-full border border-line bg-background">
      <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
