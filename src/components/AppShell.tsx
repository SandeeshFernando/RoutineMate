import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Trophy, Award, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/routine", label: "Routine", icon: ListChecks },
  { to: "/challenge", label: "Challenge", icon: Trophy },
  { to: "/rewards", label: "Rewards", icon: Award },
] as const;

export function AppShell() {
  const { signOut, user } = useAuth();
  const loc = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base">RoutineMate</span>
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            title={user?.email ?? ""}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid h-full max-w-md grid-cols-4">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}