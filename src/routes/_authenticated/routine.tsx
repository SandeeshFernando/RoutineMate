import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/routine")({ component: RoutinePage });

function RoutinePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tasks } = useQuery({
    queryKey: ["all-tasks", user?.id],
    queryFn: async () => (await supabase.from("tasks").select("*, goals(title, category)").eq("user_id", user!.id).order("created_at", { ascending: true })).data ?? [],
    enabled: !!user,
  });
  const toggle = useMutation({
    mutationFn: async (t: any) => {
      const next = t.status === "completed" ? "pending" : "completed";
      await supabase.from("tasks").update({ status: next }).eq("id", t.id);
      if (next === "completed" && user) {
        const { data: prof } = await supabase.from("profiles").select("total_points").eq("id", user.id).maybeSingle();
        await supabase.from("profiles").update({ total_points: (prof?.total_points ?? 0) + 10 }).eq("id", user.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-tasks"] }),
  });
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const done = tasks?.filter((t: any) => t.status === "completed").length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{today}</p>
        <h1 className="text-2xl font-bold">Today's routine</h1>
        <p className="mt-1 text-sm text-muted-foreground">{done} of {tasks?.length ?? 0} tasks complete</p>
      </div>
      {!tasks?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">No tasks yet. Create a goal to get started.</p>
          <Link to="/goals/new" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground">New goal</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <button key={t.id} onClick={() => toggle.mutate(t)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left">
              {t.status === "completed" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${t.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
                {t.goals?.title && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.goals.title}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
