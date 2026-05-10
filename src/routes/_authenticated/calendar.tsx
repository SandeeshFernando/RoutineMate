import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

type Routine = {
  id: string;
  routine_date: string;
  morning_plan: string | null;
  evening_review: string | null;
  main_tasks: { focus?: string; tasks?: string; time?: string }[] | null;
  status: string | null;
  goal_id: string | null;
};

function CalendarPage() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(toIso(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const { data: routines } = useQuery<Routine[]>({
    queryKey: ["calendar-routines", user?.id, toIso(monthStart), toIso(monthEnd)],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_routines")
        .select("id, routine_date, morning_plan, evening_review, main_tasks, status, goal_id")
        .eq("user_id", user!.id)
        .gte("routine_date", toIso(monthStart))
        .lte("routine_date", toIso(monthEnd));
      return (data ?? []) as Routine[];
    },
    enabled: !!user,
  });

  const { data: reminders } = useQuery({
    queryKey: ["calendar-reminders", user?.id],
    queryFn: async () =>
      (await supabase
        .from("reminders")
        .select("id, reminder_time, message, goal_id, is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true)).data ?? [],
    enabled: !!user,
  });

  const byDate = useMemo(() => {
    const m = new Map<string, Routine[]>();
    for (const r of routines ?? []) {
      const list = m.get(r.routine_date) ?? [];
      list.push(r);
      m.set(r.routine_date, list);
    }
    return m;
  }, [routines]);

  const days = buildMonthGrid(cursor);
  const todayIso = toIso(new Date());
  const selectedRoutines = byDate.get(selected) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your roadmap, day by day. Synced from Aria.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
          <div className="px-2 text-sm font-semibold">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const iso = toIso(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const has = byDate.has(iso);
            const isToday = iso === todayIso;
            const isSel = iso === selected;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={`relative aspect-square rounded-lg border text-xs transition ${
                  isSel ? "border-primary bg-primary/10" : "border-transparent hover:bg-secondary/60"
                } ${inMonth ? "text-foreground" : "text-muted-foreground/40"}`}
              >
                <span className={`absolute left-1.5 top-1 ${isToday ? "rounded-md bg-primary px-1 text-[10px] font-bold text-primary-foreground" : ""}`}>{d.getDate()}</span>
                {has && <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalIcon className="h-4 w-4 text-primary" />
          {new Date(selected + "T00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        {selectedRoutines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No plan for this day yet. Ask Aria for a roadmap and tap <strong>Sync to calendar</strong>.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedRoutines.flatMap((r) =>
              (r.main_tasks ?? []).map((t, idx) => (
                <div key={`${r.id}-${idx}`} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{t.focus || "Focus"}</span>
                      {t.time && <span className="text-xs text-muted-foreground">{t.time}</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.tasks}</p>
                  </div>
                </div>
              )),
            )}
          </div>
        )}

        {!!reminders?.length && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Bell className="h-3 w-3" /> Active reminders
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reminders.map((r) => (
                <span key={r.id} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">
                  {String(r.reminder_time).slice(0, 5)} · {r.message}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildMonthGrid(cursor: Date) {
  const start = startOfMonth(cursor);
  const startWeekday = start.getDay();
  const first = new Date(start);
  first.setDate(start.getDate() - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    return d;
  });
}