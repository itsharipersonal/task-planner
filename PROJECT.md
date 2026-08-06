# Forge OS — Project Documentation

**Package name:** `task-planner`  
**Product name:** Forge OS  
**Tagline:** AI Accountability Engine  
**Version:** 0.1.0

Timed skill challenges → proof submission → AI/heuristic scoring → XP, streaks, badges, and leaderboard.

---

## 1. Overview

Forge OS is a gamified accountability app. Users sign in with Google, pick a category and difficulty, complete a timed challenge (prep + work windows), submit proof (text, video, audio, code, quiz, or image description), and receive scored feedback. Completions award XP, coins, streak progress, and badges. Admins can manage categories, templates, and score overrides.

The repo started as a task planner; challenge/gamification is the primary product surface. Legacy task APIs and `task-board` remain but are not in the main app nav.

---

## 2. Tech Stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16.3 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, shadcn / Base UI, lucide-react |
| Auth | Auth.js (next-auth v5) + Google OAuth + `@auth/d1-adapter` |
| Database | Cloudflare D1 (`task-planner-db`) |
| Deploy | Cloudflare Workers via `@opennextjs/cloudflare` |
| AI | OpenRouter (default model: `anthropic/claude-sonnet-4`) |
| Package manager | pnpm 11 |

---

## 3. Core Loop

1. User browses categories on `/challenges` or starts the daily challenge from `/dashboard`.
2. Server creates an attempt (AI-generated, template, or local fallback).
3. User starts → prep timer → work timer (`preparing` → `active`).
4. User submits proof (`submitted` → `evaluating`).
5. Scorer evaluates (OpenRouter rubric, quiz auto-score, or heuristic fallback).
6. XP / coins / streak / badges update; notification may fire; attempt becomes `completed` or `failed`.

---

## 4. Challenge Categories

Config lives in `src/lib/challenges/registry.ts`. DB stores enable/sort only.

| ID | Name |
|----|------|
| `public-speaking` | Public Speaking |
| `writing` | Writing |
| `coding` | Coding |
| `reading` | Reading |
| `mental-math` | Mental Math |
| `interview` | Interview Practice |
| `language` | Language Practice |
| `fitness` | Fitness |
| `creativity` | Creativity |
| `sales-pitch` | Sales Pitch |
| `problem-solving` | Problem Solving |
| `social-confidence` | Social Confidence |
| `learning-sprint` | Learning Sprint |

Each category defines difficulties (`easy` / `medium` / `hard`), timers, XP bases, submission type, rubrics, and fallback templates.

**Submission types:** `video` | `audio` | `text` | `quiz` | `code` | `image`

**Attempt statuses:** `not_started` → `preparing` → `active` → `submitted` → `evaluating` → `completed` | `failed`

---

## 5. Gamification

Defined in `src/lib/gamification.ts`.

- **XP → level:** Level N starts at `(N-1)² × 100` XP.
- **Award:** `baseXp[difficulty] × (score / 100)`, floor 5; daily challenges × 1.5.
- **Coins:** `max(1, floor(xp / 4))`.
- **Streaks:** UTC date-based; consecutive days increment, gaps reset to 1.
- **Badges (14):** first completion milestones, streak 3/7/30, level 5/10, score 90+/100, 5 categories, daily challenge.

---

## 6. App Routes

| Route | Purpose |
|-------|---------|
| `/` | Google sign-in gate; redirects authenticated users to `/dashboard` |
| `/dashboard` | Streak, level, XP, daily challenge, categories, recent activity |
| `/challenges` | Browse enabled categories; start by difficulty |
| `/challenges/[id]` | Live attempt runner (prep → work → submit → feedback) |
| `/leaderboard` | Global and weekly XP ranks |
| `/history` | Past attempts |
| `/profile` | Stats, badge preview, sign-out |
| `/achievements` | Full badge gallery |
| `/admin` | Admin panel (DB roles: moderator+) — dashboard, users, challenges, gamification, AI, settings |

Auth guard: `src/app/(app)/layout.tsx` (session required).

---

## 7. API Routes

### Auth & setup
- `GET/POST /api/auth/[...nextauth]` — Auth.js handlers
- `GET/POST /api/setup` — D1 Auth adapter migrate helper

### Challenges
- `GET/POST /api/challenges` — list / create attempt
- `GET /api/challenges/[id]` — attempt detail
- `POST /api/challenges/[id]/start` — start timers
- `POST /api/challenges/[id]/submit` — submit + evaluate
- `POST /api/challenges/[id]/abandon` — abandon attempt

### App data
- `GET /api/dashboard`
- `GET /api/profile`
- `GET /api/leaderboard`
- `GET /api/notifications`

### Admin
- `GET /api/admin/overview`
- `GET/POST /api/admin/templates`
- `PATCH/DELETE /api/admin/templates/[id]`
- `PATCH /api/admin/categories/[id]`
- `PATCH /api/admin/attempts/[id]` — score override

### Legacy
- `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`

Business logic lives in `src/lib/challenges/service.ts`. Auth helpers: `requireUserId` / `requireAdmin` in `src/lib/auth.ts`.

---

## 8. Key Source Files

```
src/
  app/
    page.tsx                 # Landing / auth gate
    layout.tsx               # Root layout
    auth.ts                  # NextAuth config (Google + D1)
    (app)/
      layout.tsx             # Session guard + nav shell
      dashboard|challenges|history|leaderboard|
      profile|achievements|admin/page.tsx
    api/                     # Route handlers (see §7)
  components/
    challenges/
      nav.tsx
      category-card.tsx
      challenge-runner.tsx
      countdown.tsx
      media-capture.tsx
      notification-bell.tsx
      admin-panel.tsx
    ui/button.tsx
    task-board.tsx           # Legacy
  lib/
    challenges/
      registry.ts            # Category configs
      service.ts             # Attempt lifecycle + queries
      types.ts
    gamification.ts
    ai.ts                    # OpenRouter generate / evaluate
    auth.ts
    tasks.ts                 # Legacy
    utils.ts
migrations/
  0001_init.sql              # tasks
  0002_auth.sql              # Auth.js tables
  0003_challenges.sql        # Challenges + gamification schema
```

---

## 9. Database Schema (D1)

### Auth (`0002`)
`users`, `accounts`, `sessions`, `verification_tokens` (+ `tasks.user_id`)

### Challenges (`0003`)
| Table | Role |
|-------|------|
| `challenge_categories` | Enable + sort_order |
| `challenge_templates` | Admin/custom templates |
| `challenge_attempts` | User attempts + timers/scores |
| `challenge_submissions` | Proof payloads |
| `challenge_feedback` | Rubric scores, strengths, improvements |
| `user_progress` | XP, coins, totals |
| `user_streaks` | Current / longest / last date |
| `user_badges` | Earned badges |
| `xp_history` | XP ledger |
| `notifications` | In-app notifications |

---

## 10. Environment & Cloudflare

### Bindings (`wrangler.jsonc`)
- Worker: `task-planner`
- D1: `DB` → `task-planner-db`
- Assets: `ASSETS`
- Flags: `nodejs_compat`

### Secrets / vars (see `dev.vars.example`)
| Var | Purpose |
|-----|---------|
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_URL` | App URL (e.g. `http://localhost:8787`) |
| `OPENROUTER_API_KEY` | AI challenges + scoring |
| `OPENROUTER_MODEL` | Optional model override |
| `ADMIN_EMAILS` | Comma-separated admin emails |

Local: `.dev.vars` / `.env.local`  
Types: `cloudflare-env.d.ts` (regenerate with `pnpm cf-typegen`)

---

## 11. Scripts

```bash
pnpm dev                  # Next.js local dev
pnpm build                # Production build
pnpm lint                 # ESLint
pnpm preview              # OpenNext build + Cloudflare preview
pnpm deploy               # OpenNext build + Cloudflare deploy
pnpm cf-typegen           # Regenerate CloudflareEnv types
pnpm db:migrate:local     # Apply D1 migrations locally
pnpm db:migrate:remote    # Apply D1 migrations remotely
```

---

## 12. Architecture Notes

- **Config vs data:** Category metadata (timers, rubrics, fallbacks) is code-owned in `registry.ts`. D1 stores runtime rows and enable flags.
- **AI optional:** Without `OPENROUTER_API_KEY`, generation/scoring falls back to templates and heuristics; math/quiz can still auto-score.
- **Thin routes:** API handlers authenticate and delegate to `service.ts`.
- **Admin:** Gated by DB `role` (`moderator` / `admin` / `super_admin`); `ADMIN_EMAILS` bootstraps `super_admin` on sign-in. Dedicated `/admin` shell with sidebar.
- **Legacy:** Task board/API still present from the original task-planner phase; not linked in challenge nav.

---

## 13. Product Surface Summary

Authenticated users get a dashboard with daily challenge and progress, a challenge catalog with live timed runners and media capture, history, profile stats, achievements, notifications, and a global/weekly leaderboard. Admins get metrics, category toggles, template CRUD, and score overrides. The stack is Next.js on Cloudflare Workers with D1 persistence, Google auth, and OpenRouter for dynamic challenge generation and rubric-based evaluation.
