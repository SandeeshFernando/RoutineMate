import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateAiPlan } from "@/lib/ai-plan.functions";

export const Route = createFileRoute("/_authenticated/goals/new")({
  component: NewGoal,
  head: () => ({
    meta: [
      { title: "New Goal — RoutineMate AI" },
      { name: "description", content: "Create a new goal and let Aria build an AI-powered daily routine, tasks, reminder, and 21-day challenge for you." },
      { property: "og:title", content: "New Goal — RoutineMate AI" },
      { property: "og:description", content: "Create a goal and get an AI routine and 21-day challenge." },
      { property: "og:url", content: "https://achieve-ai-app.lovable.app/goals/new" },
    ],
    links: [{ rel: "canonical", href: "https://achieve-ai-app.lovable.app/goals/new" }],
  }),
});

const CATEGORIES = ["Study", "Fitness", "Career", "Personal Development", "Business", "Health", "Finance", "Other"];
const TIMES = ["30 minutes", "1 hour", "2 hours", "3 hours", "4+ hours"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const PRIORITIES = ["Low", "Medium", "High", "Very High"];
const STYLES = ["Easy", "Balanced", "Strict"];

function NewGoal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const generate = useServerFn(generateAiPlan);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Study");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [time, setTime] = useState(() => localStorage.getItem("rm_time") ?? "1 hour");
  const [level, setLevel] = useState("Beginner");
  const [priority, setPriority] = useState("Medium");
  const [style, setStyle] = useState(() => localStorage.getItem("rm_style") ?? "Balanced");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem("rm_reminder") ?? "08:00");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Goal title is required");
    setBusy(true);
    localStorage.setItem("rm_style", style);
    localStorage.setItem("rm_time", time);
    localStorage.setItem("rm_reminder", reminderTime);

    const cleanTasks = tasks.map((t) => t.trim()).filter(Boolean);

    // 1. create goal
    const { data: goal, error: gErr } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: title.trim(),
        category,
        description,
        deadline: deadline || null,
        available_time_per_day: time,
        current_level: level,
        priority,
        routine_style: style,
      })
      .select()
      .single();
    if (gErr || !goal) {
      setBusy(false);
      return toast.error(gErr?.message ?? "Could not create goal");
    }

    // 2. tasks
    if (cleanTasks.length) {
      await supabase.from("tasks").insert(
        cleanTasks.map((t) => ({
          goal_id: goal.id,
          user_id: user.id,
          title: t,
          priority,
        })),
      );
    }

    // 3. reminder
    if (reminderTime) {
      await supabase.from("reminders").insert({
        user_id: user.id,
        goal_id: goal.id,
        reminder_type: "start_routine",
        reminder_time: reminderTime,
        message: "Time to start your routine!",
      });
    }

    // 4. seed badges
    await supabase.from("badges").insert([
      { user_id: user.id, goal_id: goal.id, badge_name: "Starter", badge_description: "Completed Day 3", badge_icon: "🌱", day_unlocked: 3 },
      { user_id: user.id, goal_id: goal.id, badge_name: "Consistency", badge_description: "Completed Day 7", badge_icon: "🔥", day_unlocked: 7 },
      { user_id: user.id, goal_id: goal.id, badge_name: "Discipline", badge_description: "Completed Day 14", badge_icon: "💎", day_unlocked: 14 },
      { user_id: user.id, goal_id: goal.id, badge_name: "Goal Master", badge_description: "Completed Day 21", badge_icon: "👑", day_unlocked: 21 },
    ]);

    // 5. seed 21-day challenge
    const today = new Date();
    await supabase.from("challenge_progress").insert(
      Array.from({ length: 21 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return {
          user_id: user.id,
          goal_id: goal.id,
          day_number: i + 1,
          challenge_date: d.toISOString().slice(0, 10),
          status: "pending" as const,
        };
      }),
    );

    // 6. AI plan
    toast.message("Generating your AI routine...");
    const result = await generate({
      data: {
        title: title.trim(),
        category,
        description,
        deadline,
        available_time_per_day: time,
        current_level: level,
        priority,
        routine_style: style,
        tasks: cleanTasks,
        reminder_time: reminderTime,
      },
    });

    if (result.ok) {
      await supabase.from("ai_plans").insert({
        user_id: user.id,
        goal_id: goal.id,
        daily_plan: result.plan.daily_plan,
        weekly_plan: result.plan.weekly_plan,
        strategy: result.plan.strategy,
        motivation: result.plan.motivation,
        recovery_plan: result.plan.recovery_plan,
        challenge_plan: result.plan.challenge_plan,
        raw_ai_response: result.plan,
      });
      toast.success("Your routine is ready!");
    } else {
      toast.error(result.error);
    }

    setBusy(false);
    nav({ to: "/goals/$goalId", params: { goalId: goal.id } });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">New goal</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tell us what you want to achieve.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Goal title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Get an A in my final exam"
            className="input"
            required
          />
        </Field>
        <Field label="Category">
          <Chips options={CATEGORIES} value={category} onChange={setCategory} />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you want to achieve"
            rows={3}
            className="input min-h-[88px] py-3"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
          </Field>
          <Field label="Reminder time">
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Available time per day">
          <Chips options={TIMES} value={time} onChange={setTime} />
        </Field>
        <Field label="Current level">
          <Chips options={LEVELS} value={level} onChange={setLevel} />
        </Field>
        <Field label="Priority">
          <Chips options={PRIORITIES} value={priority} onChange={setPriority} />
        </Field>
        <Field label="Routine style">
          <Chips options={STYLES} value={style} onChange={setStyle} />
        </Field>

        <Field label="Tasks">
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={t}
                  onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Task ${i + 1}`}
                  className="input"
                />
                {tasks.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove task"
                    onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTasks([...tasks, ""])}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
          </div>
        </Field>

        <button
          disabled={busy || !title.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating your routine...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate my AI routine
            </>
          )}
        </button>
      </form>

      <style>{`
        .input { display:block; width:100%; height:3rem; border-radius:0.875rem; border:1px solid var(--color-border); background:var(--color-background); padding:0 1rem; font-size:0.875rem; outline:none; color:var(--color-foreground); }
        .input:focus { border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function Chips({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`h-10 rounded-xl border px-3 text-sm transition ${
            value === o
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}