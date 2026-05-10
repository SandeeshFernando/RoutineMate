import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/rewards")({ component: Rewards });

function Rewards() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const { data: badges } = useQuery({
    queryKey: ["badges-all", user?.id],
    queryFn: async () => (await supabase.from("badges").select("*, goals(title)").eq("user_id", user!.id).order("day_unlocked", { ascending: true })).data ?? [],
    enabled: !!user,
  });
  const unlocked = badges?.filter((b: any) => b.is_unlocked).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Rewards & Badges</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile?.total_points ?? 0} points · {unlocked} badges unlocked</p>
      </div>
      {!badges?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Create a goal to earn badges along the way.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {badges.map((b: any) => (
            <div key={b.id} className={`rounded-2xl border p-4 text-center ${b.is_unlocked ? "border-primary bg-primary/10" : "border-border bg-card opacity-60"}`}>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-2xl">
                {b.is_unlocked ? b.badge_icon : <Lock className="h-5 w-5 text-muted-foreground" />}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{b.badge_name}</h3>
              <p className="text-[11px] text-muted-foreground">{b.badge_description}</p>
              {b.goals?.title && <p className="mt-1 truncate text-[10px] text-muted-foreground">for {b.goals.title}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
