import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Mounted globally inside the authenticated shell.
 * Polls the user's active reminders for today and fires browser notifications
 * at the right time. Tracks fired reminders in localStorage so each one only
 * fires once per day.
 */
export function ReminderScheduler() {
  const { user } = useAuth();
  const firedRef = useRef<Set<string>>(loadFired());

  const { data: reminders } = useQuery({
    queryKey: ["reminders-today", user?.id],
    queryFn: async () =>
      (await supabase
        .from("reminders")
        .select("id, reminder_time, message, reminder_type, goal_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)).data ?? [],
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Ask permission once
  useEffect(() => {
    if (!user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  // Tick every 30s and fire any due reminders
  useEffect(() => {
    if (!reminders?.length) return;
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const today = now.toISOString().slice(0, 10);
      for (const r of reminders) {
        if (!r.reminder_time) continue;
        const rt = String(r.reminder_time).slice(0, 5);
        const key = `${today}:${r.id}`;
        if (rt === `${hh}:${mm}` && !firedRef.current.has(key)) {
          fire(r.message ?? "Time for your routine ✨");
          firedRef.current.add(key);
          saveFired(firedRef.current);
        }
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [reminders]);

  return null;
}

function fire(message: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("RoutineMate AI", { body: message, icon: "/favicon.ico" });
    }
  } catch {
    // ignore
  }
  // Fallback in-tab toast via dispatching an event
  window.dispatchEvent(new CustomEvent("rm-reminder", { detail: { message } }));
}

const KEY = "rm_fired_reminders_v1";
function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}
function saveFired(s: Set<string>) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify({ date: today, ids: [...s] }));
}