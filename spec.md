# RoutineMate AI — Spec

AI-powered routines, daily plans, and 21-day habit challenges.

## Stack
- React 19 + TypeScript + Vite + Tailwind v4 + TanStack Start
- Lovable Cloud (Supabase) — Postgres, Auth, RLS, Edge Functions
- Lovable AI Gateway (`google/gemini-3-flash-preview`)
  - Server function `generateAiPlan` for one-shot structured plans
  - Edge function `aria-chat` for streaming conversational coach (Aria)

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
- `src/routes/_authenticated/coach.tsx` — Aria conversational AI coach (streaming, markdown, conversation history)
- `supabase/functions/aria-chat/index.ts` — SSE streaming chat with Lovable AI
- `src/routes/_authenticated/calendar.tsx` — month-view calendar of `daily_routines` + active reminders
- `src/components/ReminderScheduler.tsx` — global poller that fires browser Notifications at each reminder time (once/day)
- `src/lib/aria-sync.ts` — parses Aria's markdown roadmap tables (Day | Date | Focus | Tasks | Time)

## Calendar + Reminders Sync
Every assistant message containing a `Day | Date | Focus | Tasks | Time` table shows a **Sync roadmap to calendar** button that:
1. Inserts one `daily_routines` row per dated row (focus + tasks + time stored in `main_tasks` jsonb).
2. Extracts `HH:MM` from the Time column and creates one active `reminders` row per unique time (deduped against existing reminders).
3. Requests browser Notification permission.

`ReminderScheduler` (mounted in `AppShell`) polls active reminders and fires a Notification + in-app toast at the matching minute. Each reminder fires once per day (tracked in localStorage).

## DB (RLS: own rows only)
profiles · goals · tasks · ai_plans · daily_routines · reminders · challenge_progress · rewards · badges · chat_conversations · chat_messages

## Aria — Personal AI Coach
Conversational AI like Claude/Gemini. The user describes their situation in plain language ("I missed 10 lectures, I work full-time, only 2 hrs/night") and Aria builds a personalised catch-up plan, daily routine, and 21-day roadmap rendered in markdown tables (Day | Date | Focus | Tasks | Time) so it can sync with calendar/challenge views. Aria has read context of the user's existing goals and ties advice to the points/badges/challenge system.

## Flow
Create Goal → insert goal + tasks + reminder + 4 locked badges + 21 pending challenge days → call `generateAiPlan` → save `ai_plans` → navigate to goal detail.

## Gamification
- Task complete: +10 pts
- Challenge day: +50 pts, streak +1
- Days 3/7/14/21 unlock Starter / Consistency / Discipline / Goal Master badges

## Design System
Dark, mobile-first. `oklch` tokens in `src/styles.css` (bg #0f172a, card #1e293b, primary teal #14b8a6). Bottom nav (Home/Routine/Challenge/Rewards) on mobile, ≥48px tap targets.
