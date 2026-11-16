export type Role = "stage" | "exhibitor";
export type TeamMember = { name: string; role: Role };
export const ROLE_LABEL: Record<Role, string> = { stage: "Stage · Live translation", exhibitor: "Exhibitor · ออกบูธ" };

export function normalize(e: any): CalEvent {
  return { ...e, team: (e.team || []).map((t: any) => (typeof t === "string" ? { name: t, role: "stage" } : t)) };
}

/** Map each day (YYYY-MM-DD) to events covering it, with day index. */
export function eventsByDay(events: CalEvent[]) {
  const out: Record<string, { e: CalEvent; day: number; total: number }[]> = {};
  for (const e of events) {
    const start = new Date(e.date + "T00:00");
    const end = new Date((e.endDate && e.endDate >= e.date ? e.endDate : e.date) + "T00:00");
    const total = Math.round((+end - +start) / 864e5) + 1;
    for (let i = 0; i < total && i < 366; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      (out[ymd(d)] ||= []).push({ e, day: i + 1, total });
    }
  }
  return out;
}

export type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD start
  endDate?: string; // YYYY-MM-DD inclusive
  title: string;
  location: string;
  details: string;
  team: TeamMember[];
  url: string;
};

const KEY = "event-calendar-v1";

export function loadEvents(): CalEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]").map(normalize);
  } catch {
    return [];
  }
}
export function saveEvents(e: CalEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(e));
}

export function encodeEvents(e: CalEvent[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(e));
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeEvents(str: string): CalEvent[] {
  try {
    const b = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(b, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)).map(normalize);
  } catch {
    return [];
  }
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Weeks (Mon-first) covering the given month; null = outside month. */
export function monthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= days; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
