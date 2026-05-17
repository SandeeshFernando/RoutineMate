import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Plus, Loader2, MessageCircle, Calendar as CalIcon, CalendarPlus, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { extractRoadmap, extractTime, type RoadmapRow } from "@/lib/aria-sync";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coach")({
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Aria — Your AI Coach | RoutineMate AI" },
      { name: "description", content: "Chat with Aria, your personal AI coach. Describe your schedule and she designs your routine, catch-up plan, and 21-day roadmap." },
      { property: "og:title", content: "Aria — Your AI Coach | RoutineMate AI" },
      { property: "og:description", content: "Chat with Aria to build your personalized routine and roadmap." },
      { property: "og:url", content: "https://achieve-ai-app.lovable.app/coach" },
    ],
    links: [{ rel: "canonical", href: "https://achieve-ai-app.lovable.app/coach" }],
  }),
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "I missed 10 lectures and I work full-time. Build me a catch-up plan.",
  "Design a 1-hour evening routine for fitness + study.",
  "Help me prepare for an exam in 14 days, only 2 hrs/day free.",
  "Make me a 21-day discipline roadmap for waking up at 5 AM.",
];

function CoachPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["aria-conversations", user?.id],
    queryFn: async () =>
      (await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(20)).data ?? [],
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ["coach-goals", user?.id],
    queryFn: async () =>
      (await supabase.from("goals").select("id,title,category,deadline,available_time_per_day,priority").eq("user_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  const userContext = useMemo(() => {
    if (!goals?.length) return "User has no active goals yet.";
    return "Active goals:\n" + goals.map((g) => `- ${g.title} (${g.category}, time/day: ${g.available_time_per_day ?? "n/a"}, priority: ${g.priority ?? "n/a"}, deadline: ${g.deadline ?? "none"})`).join("\n");
  }, [goals]);

  // Load latest conversation on mount
  useEffect(() => {
    if (!user || conversationId !== null) return;
    if (conversations && conversations.length) {
      void selectConversation(conversations[0].id);
    }
  }, [user, conversations, conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function selectConversation(id: string) {
    setConversationId(id);
    const { data } = await supabase
      .from("chat_messages")
      .select("id,role,content")
      .eq("conversation_id", id)
      .order("created_at");
    setMessages((data ?? []).map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
  }

  async function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
  }

  async function ensureConversation(firstUserMsg: string): Promise<string | null> {
    if (conversationId) return conversationId;
    const title = firstUserMsg.slice(0, 60);
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user!.id, title })
      .select()
      .single();
    if (error || !data) {
      toast.error("Couldn't start a chat");
      return null;
    }
    setConversationId(data.id);
    qc.invalidateQueries({ queryKey: ["aria-conversations", user?.id] });
    return data.id;
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming || !user) return;
    setInput("");
    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const convId = await ensureConversation(content);
    if (!convId) {
      setStreaming(false);
      return;
    }

    await supabase.from("chat_messages").insert({ conversation_id: convId, user_id: user.id, role: "user", content });

    let assistantSoFar = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aria-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          context: userContext,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(j.error ?? "Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m)));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        await supabase.from("chat_messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: assistantSoFar });
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to chat";
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  async function syncRoadmap(markdown: string) {
    if (!user || syncing) return;
    const rows = extractRoadmap(markdown);
    if (!rows.length) {
      toast.error("I couldn't find a Day | Date | Tasks table in that reply. Ask Aria to put the plan in a table.");
      return;
    }
    setSyncing(true);
    try {
      const goalId = goals?.[0]?.id ?? null;

      // Upsert daily_routines per date
      const { error: rErr } = await supabase.from("daily_routines").upsert(
        rows.map((r) => ({
          user_id: user.id,
          goal_id: goalId,
          routine_date: r.date,
          morning_plan: r.focus || null,
          main_tasks: JSON.parse(JSON.stringify([{ focus: r.focus, tasks: r.tasks, time: r.time }])),
          total_tasks: 1,
          completed_tasks: 0,
          status: "pending",
        })) as never,
        { onConflict: "user_id,goal_id,routine_date", ignoreDuplicates: false } as never,
      );
      // Some schemas don't have that unique index; fall back to plain insert if upsert fails
      if (rErr) {
          await supabase.from("daily_routines").insert(
          rows.map((r) => ({
            user_id: user.id,
            goal_id: goalId,
            routine_date: r.date,
            morning_plan: r.focus || null,
              main_tasks: JSON.parse(JSON.stringify([{ focus: r.focus, tasks: r.tasks, time: r.time }])),
            total_tasks: 1,
            completed_tasks: 0,
            status: "pending",
            })) as never,
        );
      }

      // Build reminders from rows that have a parseable time
      const reminderRows: { time: string; row: RoadmapRow }[] = [];
      for (const r of rows) {
        const t = extractTime(r.time);
        if (t) reminderRows.push({ time: t, row: r });
      }
      const uniqueTimes = new Map<string, string>();
      for (const { time, row } of reminderRows) {
        if (!uniqueTimes.has(time)) {
          uniqueTimes.set(time, row.focus || row.tasks.slice(0, 80) || "Time for your routine");
        }
      }
      let remindersCreated = 0;
      if (uniqueTimes.size) {
        // Avoid duplicating identical existing reminders
        const { data: existing } = await supabase
          .from("reminders")
          .select("reminder_time")
          .eq("user_id", user.id)
          .eq("is_active", true);
        const existingSet = new Set((existing ?? []).map((e) => String(e.reminder_time).slice(0, 5)));

        const toInsert = [...uniqueTimes.entries()]
          .filter(([t]) => !existingSet.has(t))
          .map(([t, msg]) => ({
            user_id: user.id,
            goal_id: goalId,
            reminder_type: "aria_routine",
            reminder_time: t,
            message: msg,
            is_active: true,
          }));
        if (toInsert.length) {
          const { error } = await supabase.from("reminders").insert(toInsert);
          if (!error) remindersCreated = toInsert.length;
        }
      }

      // Browser notification permission
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }

      qc.invalidateQueries({ queryKey: ["calendar-routines"] });
      qc.invalidateQueries({ queryKey: ["calendar-reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders-today"] });

      toast.success(`Synced ${rows.length} day${rows.length > 1 ? "s" : ""} to calendar · ${remindersCreated} reminder${remindersCreated === 1 ? "" : "s"} set`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't sync this plan. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <h1 className="sr-only">Aria — your personal AI coach chat</h1>
      {/* Sidebar */}
      <aside className="hidden md:block">
        <button
          onClick={newChat}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="mt-3 space-y-1">
          {conversations?.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                conversationId === c.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex h-[calc(100vh-9rem)] flex-col rounded-2xl border border-border bg-card md:h-[calc(100vh-7rem)]">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-purple-500 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-bold">Aria</div>
              <div className="text-[11px] text-muted-foreground">Your personal AI coach</div>
            </div>
          </div>
          <button onClick={newChat} className="md:hidden inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs">
            <Plus className="h-3 w-3" /> New
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-primary-foreground shadow-[var(--shadow-glow)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Hi, I'm Aria 👋</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell me about your goal, your schedule, or what's on your mind. I'll build a routine and roadmap that actually fits your life.
              </p>
              <div className="mt-6 grid gap-2 text-left">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground hover:border-primary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <Bubble
                  key={m.id ?? i}
                  role={m.role}
                  content={m.content}
                  onSync={m.role === "assistant" ? () => syncRoadmap(m.content) : undefined}
                  syncing={syncing}
                  onOpenCalendar={() => navigate({ to: "/calendar" })}
                />
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Aria is thinking...
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-border p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask Aria anything — your goals, schedule, struggles..."
              className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || streaming}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalIcon className="h-3 w-3" /> Aria sees your goals and builds plans that sync with your 21-day challenges.
          </p>
        </form>
      </section>
    </div>
  );
}

function Bubble({
  role,
  content,
  onSync,
  syncing,
  onOpenCalendar,
}: {
  role: "user" | "assistant";
  content: string;
  onSync?: () => void;
  syncing?: boolean;
  onOpenCalendar?: () => void;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  const hasRoadmap = !!onSync && extractRoadmap(content).length > 0;
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-purple-500 text-primary-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-table:my-3 prose-th:bg-secondary prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-table:border-border prose-th:border prose-th:border-border prose-td:border prose-td:border-border overflow-x-auto rounded-2xl rounded-tl-sm bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "..."}</ReactMarkdown>
        </div>
        {hasRoadmap && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
              Sync roadmap to calendar
            </button>
            <button
              onClick={onOpenCalendar}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium hover:bg-secondary"
            >
              <CalIcon className="h-3.5 w-3.5" /> Open calendar
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Bell className="h-3 w-3" /> Reminders auto-set from times in the table
            </span>
          </div>
        )}
      </div>
    </div>
  );
}