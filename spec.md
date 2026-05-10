# RoutineMate AI — Spec

AI-powered routines, daily plans, and 21-day habit challenges.

## Stack
- React 19 + TypeScript + Vite + Tailwind v4 + TanStack Start
- Lovable Cloud (Supabase) — Postgres, Auth, RLS
- Lovable AI Gateway (`google/gemini-3-flash-preview`) via TanStack server function

## Structure
- `src/contexts/AuthContext.tsx` — Supabase session provider
- `src/components/AppShell.tsx` — header + mobile bottom-tab nav
- `src/lib/ai-plan.functions.ts` — server fn calling AI gateway with structured tool-calling
- `src/routes/__root.tsx` — QueryClient + AuthProvider + Toaster
- `src/routes/index.tsx` — landing
- `src/routes/login.tsx` / `signup.tsx` — email/password + managed Google OAuth
- `src/routes/_authenticated.tsx` — auth gate
- `src/routes/_authenticated/dashboard.tsx` — greeting, stats, goals
- `src/routes/_authenticated/goals.new.tsx` — create goal + AI plan
- `src/routes/_authenticated/goals.$goalId.tsx` — tabs: AI Plan, Tasks, 21-day Challenge
- `src/routes/_authenticated/routine.tsx` — today's tasks
- `src/routes/_authenticated/challenge.tsx` — 21-day progress per goal
- `src/routes/_authenticated/rewards.tsx` — badges

## DB (RLS: own rows only)
profiles · goals · tasks · ai_plans · daily_routines · reminders · challenge_progress · rewards · badges

## Flow
Create Goal → insert goal + tasks + reminder + 4 locked badges + 21 pending challenge days → call `generateAiPlan` → save `ai_plans` → navigate to goal detail.

## Gamification
- Task complete: +10 pts
- Challenge day: +50 pts, streak +1
- Days 3/7/14/21 unlock Starter / Consistency / Discipline / Goal Master badges

## Design System
Dark, mobile-first. `oklch` tokens in `src/styles.css` (bg #0f172a, card #1e293b, primary teal #14b8a6). Bottom nav (Home/Routine/Challenge/Rewards) on mobile, ≥48px tap targets.
