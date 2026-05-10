import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    nav({ to: "/dashboard" });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error("Google sign-up failed");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <Link to="/" className="mx-auto flex max-w-md items-center gap-2 font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
        RoutineMate
      </Link>
      <div className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start your AI-powered routine in seconds.</p>
        <button onClick={google} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-sm font-medium hover:bg-secondary/70">Continue with Google</button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" /></div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          <button disabled={busy} className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Creating account..." : "Sign up"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary">Log in</Link></p>
      </div>
    </div>
  );
}
