import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/challenge")({ component: ChallengePage });

function ChallengePage() {
  const { user } = useAuth();
  const { data: goals } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => (await supabase.from("goals").select("*").eq("user_id", user!.id)).data ?? [],
    enabled: !!user,
  });
  const { data: progress } = useQuery({
    queryKey: ["all-challenge", user?.id],
    queryFn: async () => (await supabase.from("challenge_progress").select("*").eq("user_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">21-Day Challenge</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build real habits in just 21 days.</p>
      </div>
      {!goals?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Trophy className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Create a goal to start your first challenge.</p>
          <Link to="/goals/new" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground">New goal</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const days = progress?.filter((p) => p.goal_id === g.id) ?? [];
            const done = days.filter((d) => d.status === "completed").length;
            return (
              <Link key={g.id} to="/goals/$goalId" params={{ goalId: g.id }} className="block rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{g.title}</h3>
                    <p className="text-xs text-muted-foreground">Day {done} of 21</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(done / 21) * 100}%` }} /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
