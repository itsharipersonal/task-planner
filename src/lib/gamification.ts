import type { Difficulty } from "./challenges/types";

/** Level N starts at (N-1)^2 * 100 XP. L1: 0, L2: 100, L3: 400, L4: 900 ... */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  needed: number;
  percent: number;
} {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const intoLevel = xp - floor;
  const needed = ceiling - floor;
  return {
    level,
    intoLevel,
    needed,
    percent: Math.min(100, Math.round((intoLevel / needed) * 100)),
  };
}

export function computeXpAward(
  baseXp: Record<Difficulty, number>,
  difficulty: Difficulty,
  score: number,
  isDaily: boolean,
): number {
  const scaled = Math.round(baseXp[difficulty] * (score / 100));
  const withFloor = Math.max(5, scaled);
  return isDaily ? Math.round(withFloor * 1.5) : withFloor;
}

export function computeCoins(xp: number): number {
  return Math.max(1, Math.floor(xp / 4));
}

export function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Pure streak transition given the previous state and the completion date. */
export function nextStreak(
  lastActivityDate: string | null,
  currentStreak: number,
  longestStreak: number,
  today: string,
): { current: number; longest: number; changed: boolean } {
  if (lastActivityDate === today) {
    return { current: currentStreak, longest: longestStreak, changed: false };
  }
  const yesterday = utcDateString(new Date(Date.parse(today) - 86_400_000));
  const current = lastActivityDate === yesterday ? currentStreak + 1 : 1;
  return { current, longest: Math.max(longestStreak, current), changed: true };
}

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  glyph: string;
  check: (s: BadgeStats) => boolean;
};

export type BadgeStats = {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  lastScore: number;
  distinctCategories: number;
  completedDaily: boolean;
};

export const BADGES: BadgeDef[] = [
  { id: "first-blood", name: "First Blood", description: "Complete your first challenge.", glyph: "01", check: (s) => s.totalCompleted >= 1 },
  { id: "five-alive", name: "Five Alive", description: "Complete 5 challenges.", glyph: "05", check: (s) => s.totalCompleted >= 5 },
  { id: "double-digits", name: "Double Digits", description: "Complete 10 challenges.", glyph: "10", check: (s) => s.totalCompleted >= 10 },
  { id: "quarter-century", name: "Quarter Century", description: "Complete 25 challenges.", glyph: "25", check: (s) => s.totalCompleted >= 25 },
  { id: "half-century", name: "Half Century", description: "Complete 50 challenges.", glyph: "50", check: (s) => s.totalCompleted >= 50 },
  { id: "streak-3", name: "Warming Up", description: "Reach a 3-day streak.", glyph: "S3", check: (s) => s.currentStreak >= 3 },
  { id: "streak-7", name: "One Week Wired", description: "Reach a 7-day streak.", glyph: "S7", check: (s) => s.currentStreak >= 7 },
  { id: "streak-30", name: "Iron Month", description: "Reach a 30-day streak.", glyph: "S30", check: (s) => s.currentStreak >= 30 },
  { id: "level-5", name: "Operator", description: "Reach level 5.", glyph: "L5", check: (s) => s.level >= 5 },
  { id: "level-10", name: "Veteran", description: "Reach level 10.", glyph: "L10", check: (s) => s.level >= 10 },
  { id: "high-flyer", name: "High Flyer", description: "Score 90+ on a challenge.", glyph: "90+", check: (s) => s.lastScore >= 90 },
  { id: "perfect", name: "Flawless", description: "Score a perfect 100.", glyph: "100", check: (s) => s.lastScore >= 100 },
  { id: "polymath", name: "Polymath", description: "Complete challenges in 5 different categories.", glyph: "PX5", check: (s) => s.distinctCategories >= 5 },
  { id: "daily-op", name: "Daily Operative", description: "Complete a daily challenge.", glyph: "DLY", check: (s) => s.completedDaily },
];

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
