export type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  location: string;
  details: string;
  team: string[];
  url: string;
};

const KEY = "event-calendar-v1";

export function loadEvents(): CalEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
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
    return JSON.parse(new TextDecoder().decode(bytes));
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
