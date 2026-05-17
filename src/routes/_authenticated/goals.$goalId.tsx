import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowLeft, Sparkles, CheckCircle2, Circle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/goals/$goalId")({
  component: GoalDetail,
  head: () => ({
    meta: [
      { title: "Goal — RoutineMate AI" },
      { name: "description", content: "Your AI plan, daily tasks, and 21-day challenge progress for this goal." },
      { property: "og:title", content: "Goal — RoutineMate AI" },
      { property: "og:description", content: "AI plan, tasks, and 21-day progress for your goal." },
    ],
  }),
});

function GoalDetail() {
  const { goalId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"plan" | "tasks" | "challenge">("plan");

  const { data: goal } = useQuery({
    queryKey: ["goal", goalId],
    queryFn: async () => (await supabase.from("goals").select("*").eq("id", goalId).maybeSingle()).data,
  });
  const { data: plan } = useQuery({
    queryKey: ["plan", goalId],
    queryFn: async () => (await supabase.from("ai_plans").select("*").eq("goal_id", goalId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", goalId],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("goal_id", goalId).order("created_at", { ascending: true })).data ?? [],
  });
  const { data: challenge } = useQuery({
    queryKey: ["challenge", goalId],
    queryFn: async () => (await supabase.from("challenge_progress").select("*").eq("goal_id", goalId).order("day_number", { ascending: true })).data ?? [],
  });

  const toggleTask = useMutation({
    mutationFn: async (t: any) => {
      const next = t.status === "completed" ? "pending" : "completed";
      await supabase.from("tasks").update({ status: next }).eq("id", t.id);
      if (next === "completed" && user) {
        const { data: prof } = await supabase.from("profiles").select("total_points").eq("id", user.id).maybeSingle();
        await supabase.from("profiles").update({ total_points: (prof?.total_points ?? 0) + 10 }).eq("id", user.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", goalId] }); qc.invalidateQueries({ queryKey: ["profile"] }); },
  });

  const deleteGoal = useMutation({
    mutationFn: async () => { await supabase.from("goals").delete().eq("id", goalId); },
    onSuccess: () => { toast.success("Goal deleted"); qc.invalidateQueries({ queryKey: ["goals"] }); nav({ to: "/dashboard" }); },
  });

  if (!goal) return <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <button onClick={() => { if (confirm("Delete this goal and all its data?")) deleteGoal.mutate(); }} className="flex items-center gap-1 text-sm text-destructive"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">{goal.category}</span>
        <h1 className="mt-2 text-2xl font-bold">{goal.title}</h1>
        {goal.description && <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {goal.deadline && <span>📅 {goal.deadline}</span>}
          {goal.available_time_per_day && <span>⏱ {goal.available_time_per_day}</span>}
          {goal.routine_style && <span>🎯 {goal.routine_style}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
        {(["plan", "tasks", "challenge"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-10 rounded-lg text-xs font-medium transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "plan" ? "AI Plan" : t === "tasks" ? "Tasks" : "21-Day"}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <div className="space-y-3">
          {!plan ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Sparkles className="mx-auto h-6 w-6 text-primary" /><p className="mt-2 text-sm text-muted-foreground">No AI plan yet for this goal.</p></div>
          ) : (
            <>
              <PlanCard title="Today's daily plan" body={plan.daily_plan} />
              <PlanCard title="Weekly schedule" body={plan.weekly_plan} />
              <PlanCard title="Step-by-step strategy" body={plan.strategy} />
              <PlanCard title="21-day challenge" body={plan.challenge_plan ?? ""} />
              <PlanCard title="Recovery plan" body={plan.recovery_plan ?? ""} />
              {plan.motivation && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Sparkles className="h-3.5 w-3.5" /> Motivation</div>
                  <p className="mt-2 text-sm">{plan.motivation}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-2">
          {!tasks?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet.</p> : tasks.map((t: any) => (
            <button key={t.id} onClick={() => toggleTask.mutate(t)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left">
              {t.status === "completed" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1"><div className={`text-sm ${t.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{t.title}</div></div>
              {t.priority && <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{t.priority}</span>}
            </button>
          ))}
        </div>
      )}

      {tab === "challenge" && (
        <div>
          <div className="grid grid-cols-7 gap-2">
            {challenge?.map((d: any) => <ChallengeDay key={d.id} day={d} goalId={goalId} />)}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Tap a day to mark it complete. Earn badges at days 3, 7, 14 and 21.</p>
        </div>
      )}
    </div>
  );
}

function PlanCard({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ChallengeDay({ day, goalId }: { day: any; goalId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const completed = day.status === "completed";
  const milestone = [3, 7, 14, 21].includes(day.day_number);

  async function toggle() {
    if (!user) return;
    const next = completed ? "pending" : "completed";
    await supabase.from("challenge_progress").update({
      status: next,
      points_earned: next === "completed" ? 50 : 0,
      completed_at: next === "completed" ? new Date().toISOString() : null,
    }).eq("id", day.id);

    if (next === "completed") {
      const { data: prof } = await supabase.from("profiles").select("total_points,current_streak,longest_streak").eq("id", user.id).maybeSingle();
      const newStreak = (prof?.current_streak ?? 0) + 1;
      await supabase.from("profiles").update({
        total_points: (prof?.total_points ?? 0) + 50,
        current_streak: newStreak,
        longest_streak: Math.max(prof?.longest_streak ?? 0, newStreak),
      }).eq("id", user.id);

      if (milestone) {
        await supabase.from("badges").update({ is_unlocked: true, unlocked_at: new Date().toISOString() })
          .eq("user_id", user.id).eq("goal_id", goalId).eq("day_unlocked", day.day_number);
        toast.success(`🎉 Badge unlocked at day ${day.day_number}!`);
      } else {
        toast.success(`+50 points · Day ${day.day_number} done!`);
      }
    }
    qc.invalidateQueries({ queryKey: ["challenge", goalId] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["badges"] });
  }

  return (
    <button onClick={toggle} className={`relative aspect-square rounded-xl border text-xs font-semibold transition ${completed ? "border-primary bg-primary text-primary-foreground" : milestone ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
      {day.day_number}
      {milestone && <Trophy className="absolute right-1 top-1 h-2.5 w-2.5" />}
    </button>
  );
}
