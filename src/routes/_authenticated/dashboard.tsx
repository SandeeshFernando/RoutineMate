import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Target, Flame, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — RoutineMate AI" },
      { name: "description", content: "Your RoutineMate dashboard: points, streak, badges, and active goals at a glance." },
      { property: "og:title", content: "Dashboard — RoutineMate AI" },
      { property: "og:description", content: "Track your goals, streak, and badges." },
      { property: "og:url", content: "https://achieve-ai-app.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://achieve-ai-app.lovable.app/dashboard" }],
  }),
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const { data: goals } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => (await supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });
  const { data: badges } = useQuery({
    queryKey: ["badges", user?.id],
    queryFn: async () => (await supabase.from("badges").select("*").eq("user_id", user!.id).eq("is_unlocked", true)).data ?? [],
    enabled: !!user,
  });

  const greeting = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Good to see you,</p>
        <h1 className="text-2xl font-bold">Hi {greeting} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Small steps today create big results tomorrow.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Trophy} label="Points" value={profile?.total_points ?? 0} />
        <Stat icon={Flame} label="Streak" value={`${profile?.current_streak ?? 0}d`} />
        <Stat icon={Sparkles} label="Badges" value={badges?.length ?? 0} />
      </div>
      <Link to="/goals/new" className="flex items-center justify-between rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary"><Sparkles className="h-3.5 w-3.5" /> AI Coach</div>
          <h2 className="mt-1 text-base font-semibold">Generate a new routine</h2>
          <p className="text-xs text-muted-foreground">Turn a goal into a daily plan in seconds.</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></span>
      </Link>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your goals</h2>
          <Link to="/goals/new" className="text-xs text-primary">+ New goal</Link>
        </div>
        {!goals?.length ? (
          <Link to="/goals/new" className="block rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Target className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-base font-semibold">Create your first goal</h2>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">Tell RoutineMate what you want to achieve. We'll build a plan and a 21-day challenge.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New goal</span>
          </Link>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <Link key={g.id} to="/goals/$goalId" params={{ goalId: g.id }} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">{g.category}</span>
                    {g.deadline && <span className="text-[10px] text-muted-foreground">by {g.deadline}</span>}
                  </div>
                  <h2 className="mt-1 truncate text-sm font-semibold">{g.title}</h2>
                  <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${g.progress_percentage ?? 0}%` }} /></div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
