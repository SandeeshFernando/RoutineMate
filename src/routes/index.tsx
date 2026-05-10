import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles, Calendar, Trophy, Target, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [loading, user, nav]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[480px] opacity-30 blur-3xl"
        style={{ background: "var(--gradient-hero)" }}
      />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          RoutineMate
        </div>
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-12 text-center md:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI-powered productivity coach
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Achieve your goals with{" "}
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AI routines
          </span>{" "}
          & 21-day challenges.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Turn any goal into a daily plan. Stay consistent for 21 days. Earn points, unlock badges, and finally build the routine you want.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90 sm:w-auto"
          >
            Start my routine <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-medium hover:bg-secondary sm:w-auto"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target, title: "AI routines", desc: "Personalised daily plans built around your time and level." },
          { icon: Calendar, title: "Daily schedule", desc: "Time-blocked tasks with breaks you'll actually take." },
          { icon: Trophy, title: "21-day challenge", desc: "Build real habits with milestones and recovery support." },
          { icon: Sparkles, title: "Points & badges", desc: "Stay motivated with streaks, points and unlockable badges." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
            <f.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto mt-20 max-w-5xl px-4 py-8 text-center text-xs text-muted-foreground">
        Small steps every day create big results.
      </footer>
    </div>
  );
}
