import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles, Calendar, Trophy, Target, ArrowRight, MessageCircle } from "lucide-react";
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> Meet Aria — your personal AI coach
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Just talk to{" "}
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Aria
          </span>
          . She builds your routine.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Tell Aria about your goals, your busy schedule, the lectures you missed — and she'll design a personalized daily routine, catch-up plan, and 21-day roadmap that fits your real life.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90 sm:w-auto"
          >
            Chat with Aria <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-medium hover:bg-secondary sm:w-auto"
          >
            I already have an account
          </Link>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card/70 p-4 text-left shadow-[var(--shadow-glow)] backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <MessageCircle className="h-3.5 w-3.5" /> You → Aria
          </div>
          <p className="mt-2 text-sm text-foreground">
            "I missed 10 lectures and I work 9–6 at the office. I only get ~2 hours at night. Help me catch up the theory and stay sane."
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Sparkles className="h-3.5 w-3.5" /> Aria
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            "Got it — let's split your 10 lectures across 14 evenings, 45 min each, with a Sunday recap. I'll add it to your calendar, set reminders, and start your 21-day consistency challenge so you earn points + badges as you go."
          </p>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: MessageCircle, title: "Conversational AI", desc: "Chat with Aria like Claude or Gemini — she remembers your context." },
          { icon: Target, title: "Personalised plans", desc: "Catch-up roadmaps that fit your job, energy, and free hours." },
          { icon: Calendar, title: "Calendar roadmap", desc: "Every plan syncs into a day-by-day schedule you can actually follow." },
          { icon: Trophy, title: "Points & rewards", desc: "21-day challenges, streaks, and badges to keep you consistent." },
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
