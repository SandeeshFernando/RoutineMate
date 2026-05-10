import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Aria — a warm, intelligent personal AI productivity coach inside the RoutineMate AI app.

Your job:
- Have a real conversation with the user, like Claude or Gemini would.
- Listen carefully to their situation (busy job, missed lectures, stress, limited time, etc.).
- Ask 1-2 short clarifying questions ONLY if essential, otherwise jump in with help.
- Build deeply personalized daily routines, catch-up plans, and roadmaps that respect the user's REAL available time and energy.
- Always think step-by-step out loud in plain language so the user understands the strategy.
- Use clean Markdown formatting: headings, **bold**, bullet lists, numbered steps, and tables when useful.
- When you propose a multi-day plan or roadmap, ALWAYS render it as a markdown table with columns: Day | Date | Focus | Tasks | Time. Use ISO dates (YYYY-MM-DD) starting from today so the app can sync it with the user's calendar.
- Tie advice back to the user's existing goals, 21-day challenges, points, badges, and rewards in RoutineMate AI whenever relevant. Mention how completing tasks earns +10 points, challenge days +50 points, and badges unlock at day 3, 7, 14, 21.
- Be motivating, kind, and realistic. Never overload the user. Always include short breaks and a recovery plan if a day is missed.
- If the user shares stress or burnout, acknowledge it before planning.
- Keep responses focused — no fluff, no disclaimers about being an AI.

You have full memory of this conversation. Use it.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const sys =
      SYSTEM_PROMPT +
      (context
        ? `\n\nUser context (from their RoutineMate account):\n${context}`
        : "");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          stream: true,
          messages: [{ role: "system", content: sys }, ...messages],
        }),
      },
    );

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down for a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add more in workspace settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI request failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aria-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});