// Parse Aria's roadmap markdown tables and sync to calendar + reminders.

export type RoadmapRow = {
  dayNumber: number | null;
  date: string; // YYYY-MM-DD
  focus: string;
  tasks: string;
  time: string; // free-form, e.g. "07:00", "9-10pm"
};

/**
 * Extract roadmap rows from a markdown string.
 * Looks for tables with a header containing Day | Date | Focus | Tasks | Time
 * (case-insensitive, columns can appear in any order).
 */
export function extractRoadmap(markdown: string): RoadmapRow[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const rows: RoadmapRow[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    const headerCells = splitRow(line).map((s) => s.toLowerCase());
    // Need at least date + (tasks or focus)
    const hasDate = headerCells.some((c) => /\bdate\b/.test(c));
    const hasTasks = headerCells.some((c) => /\btasks?\b|\bactivit/.test(c));
    if (!hasDate || !hasTasks) continue;
    // next line should be the separator
    if (!/^\|[\s:|-]+$/.test(lines[i + 1].trim())) continue;

    const idx = {
      day: headerCells.findIndex((c) => /\bday\b/.test(c)),
      date: headerCells.findIndex((c) => /\bdate\b/.test(c)),
      focus: headerCells.findIndex((c) => /\bfocus\b|\btopic\b|\bsubject\b/.test(c)),
      tasks: headerCells.findIndex((c) => /\btasks?\b|\bactivit/.test(c)),
      time: headerCells.findIndex((c) => /\btime\b|\bwhen\b|\bslot\b/.test(c)),
    };

    let j = i + 2;
    while (j < lines.length) {
      const r = lines[j].trim();
      if (!r.startsWith("|")) break;
      const cells = splitRow(r);
      const dateRaw = idx.date >= 0 ? cells[idx.date] ?? "" : "";
      const dateIso = normalizeDate(dateRaw);
      if (dateIso) {
        rows.push({
          dayNumber: parseDayNumber(idx.day >= 0 ? cells[idx.day] : ""),
          date: dateIso,
          focus: idx.focus >= 0 ? (cells[idx.focus] ?? "") : "",
          tasks: idx.tasks >= 0 ? (cells[idx.tasks] ?? "") : "",
          time: idx.time >= 0 ? (cells[idx.time] ?? "") : "",
        });
      }
      j++;
    }
    i = j - 1;
  }
  // Dedupe by date keeping first occurrence
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.date)) return false;
    seen.add(r.date);
    return true;
  });
}

function splitRow(line: string): string[] {
  // Strip leading/trailing pipes then split, trim cells
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function parseDayNumber(s: string): number | null {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  // ISO yyyy-mm-dd
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // d/m/yyyy or m/d/yyyy — assume m/d/yyyy
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  // Month name "Nov 12, 2026" or "12 Nov 2026"
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

/** Extract first HH:MM from a free-form time string (24h or 12h). */
export function extractTime(s: string): string | null {
  if (!s) return null;
  const m24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
  const m12 = s.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const mm = m12[2] ?? "00";
    if (/pm/i.test(m12[3]) && h < 12) h += 12;
    if (/am/i.test(m12[3]) && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${mm}`;
  }
  return null;
}