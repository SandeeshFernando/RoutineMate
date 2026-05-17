import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  description: z.string().max(2000).optional().default(""),
  deadline: z.string().max(40).optional().default(""),
  available_time_per_day: z.string().max(60).optional().default(""),
  current_level: z.string().max(40).optional().default(""),
  priority: z.string().max(40).optional().default(""),
  routine_style: z.string().max(40).optional().default(""),
  tasks: z.array(z.string().max(200)).max(20).optional().default([]),
  reminder_time: z.string().max(20).optional().default(""),
});

export const generateAiPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const system = `You are RoutineMate AI, an expert productivity coach, study planner, habit designer, and goal achievement assistant.
Your job is to convert user goals and tasks into realistic daily routines, weekly schedules, and step-by-step action plans.
Behaviour rules:
1. Always create realistic routines based on the user's available time.
2. Never overload the user with too many tasks in one day.
3. Always include breaks.
4. Always explain how the user can achieve the goal step by step.
5. Always include a 21-day consistency challenge.
6. Use positive, motivating, and simple language.
7. If the deadline is difficult, clearly explain the best possible plan without discouraging the user.
8. Include recovery advice if the user misses a day.
9. Keep the plan practical and easy to follow.
10. Output via the provided structured tool — no extra prose.`;

    const userMsg = `Goal Title: ${data.title}
Category: ${data.category}
Description: ${data.description}
Deadline: ${data.deadline}
Available Time Per Day: ${data.available_time_per_day}
Current Level: ${data.current_level}
Priority: ${data.priority}
Routine Style: ${data.routine_style}
Tasks: ${data.tasks.join(", ")}
Reminder Time: ${data.reminder_time}

Generate a complete AI routine.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "build_routine_plan",
          description: "Return the structured RoutineMate AI plan.",
          parameters: {
            type: "object",
            properties: {
              daily_plan: { type: "string", description: "Today's routine, time-blocked, with breaks." },
              weekly_plan: { type: "string", description: "Weekly schedule overview." },
              strategy: { type: "string", description: "Step-by-step strategy to reach the goal." },
              motivation: { type: "string", description: "Short, warm motivational message." },
              recovery_plan: { type: "string", description: "What to do if a day is missed." },
              challenge_plan: { type: "string", description: "21-day challenge breakdown." },
            },
            required: ["daily_plan", "weekly_plan", "strategy", "motivation", "recovery_plan", "challenge_plan"],
            additionalProperties: false,
          },
        },
      },
    ];

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "build_routine_plan" } },
        }),
      });

      if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Please try again in a moment." };
      if (res.status === 402) return { ok: false as const, error: "AI credits are exhausted. Please add credits in workspace settings." };
      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { ok: false as const, error: "AI request failed. Please try again." };
      }

      const json = await res.json();
      const call = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) return { ok: false as const, error: "AI returned no plan." };
      const parsed = JSON.parse(call.function.arguments);
      return { ok: true as const, plan: parsed };
    } catch (e) {
      console.error("generateAiPlan error", e);
      return { ok: false as const, error: "Unexpected AI error." };
    }
  });