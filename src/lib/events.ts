export type Role = "stage" | "exhibitor";
export type TeamMember = { name: string; role: Role };
export const ROLE_LABEL: Record<Role, string> = {
  stage: "Stage · Live translation",
  exhibitor: "Exhibitor · ออกบูธ",
};
export const ROLE_SHORT: Record<Role, string> = { stage: "Live", exhibitor: "Exhibitor" };

export type EventType = "pay" | "sponsor";
export const TYPE_LABEL: Record<EventType, string> = { pay: "Pay", sponsor: "Sponsor" };

/** Format a baht amount, e.g. 12500 -> "฿12,500". */
export const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export const STATUSES = [
  "talking",
  "pitch",
  "demo",
  "deciding",
  "confirmed",
  "wait_qt",
  "qt_sent",
  "wait_bill",
  "paid",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  talking: "กำลังคุย",
  pitch: "รอนำเสนอ",
  demo: "Demo",
  deciding: "รอลูกค้าตัดสินใจ",
  confirmed: "ยืนยันแล้ว",
  wait_qt: "รอ QT",
  qt_sent: "QT แล้ว",
  wait_bill: "รอวางบิล",
  paid: "จ่ายแล้ว",
  cancelled: "ยกเลิก",
};

/** "-", "–" or blank mean "nobody yet", not a person called "-". */
export const isRealName = (s: string) => !/^[\s\-–—_.]*$/.test(s || "");

/** Customer contact. All fields optional free text. */
export type Contact = { name: string; phone: string; line: string; email: string };
export const emptyContact = (): Contact => ({ name: "", phone: "", line: "", email: "" });
export const hasContact = (c: Contact) => !!(c.name || c.phone || c.line || c.email);

/** LINE ID → add-friend link. "@xxx" official accounts keep the @. */
export const lineUrl = (id: string) =>
  `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith("@") ? id : "~" + id)}`;

/** Compact amount for calendar badges: 950, 12.5k, 50k, 100k, 1.2M. */
export function shortAmount(n: number): string {
  const fmt = (x: number) => String(Math.round(x * 10) / 10);
  const a = Math.abs(n);
  if (a >= 1e6) return fmt(n / 1e6) + "M";
  if (a >= 1e3) return fmt(n / 1e3) + "k";
  return fmt(n);
}

/** Calendar badge: "SPR" for sponsor, short value for pay, null when pay has no value yet. */
export function valueBadge(e: CalEvent): string | null {
  if (e.type === "sponsor") return "SPR";
  return e.value != null ? shortAmount(e.value) : null;
}

export function normalize(e: any): CalEvent {
  const type: EventType = e.type === "sponsor" ? "sponsor" : "pay";
  const value = Number(e.value);
  return {
    ...e,
    type,
    value: type === "pay" && Number.isFinite(value) ? value : undefined,
    qt: type === "pay" ? e.qt || "" : undefined,
    bl: type === "pay" ? e.bl || "" : undefined,
    customer: e.customer || "",
    status: STATUSES.includes(e.status) ? e.status : "talking",
    contact: { ...emptyContact(), ...(e.contact || {}) },
    team: (e.team || [])
      .map((t: any) => (typeof t === "string" ? { name: t, role: "stage" } : t))
      .filter((t: TeamMember) => isRealName(t.name)),
  };
}

/** Map each day (YYYY-MM-DD) to events covering it, with day index. */
export function eventsByDay(events: CalEvent[]) {
  const out: Record<string, { e: CalEvent; day: number; total: number }[]> = {};
  for (const e of events) {
    const start = new Date(e.date + "T00:00");
    const end = new Date((e.endDate && e.endDate >= e.date ? e.endDate : e.date) + "T00:00");
    const total = Math.round((+end - +start) / 864e5) + 1;
    for (let i = 0; i < total && i < 366; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
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
  type: EventType;
  /** Customer / company name. */
  customer: string;
  status: Status;
  contact: Contact;
  /** Pay only: amount in baht. */
  value?: number | undefined;
  /** Pay only: quotation number (QT). */
  qt?: string | undefined;
  /** Pay only: billing number (BL). */
  bl?: string | undefined;
};

/** Cancelled events stay on the calendar but are left out of money totals. */
export const isActive = (e: CalEvent) => e.status !== "cancelled";

/**
 * Summary for one month. An event counts in the month its start date falls in,
 * so a multi-day event that crosses months is counted once. Cancelled events are
 * counted separately and excluded from the total.
 */
export function monthSummary(events: CalEvent[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const inMonth = events.filter((e) => e.date.startsWith(prefix));
  const active = inMonth.filter(isActive);
  const pay = active.filter((e) => e.type === "pay");
  return {
    total: pay.reduce((sum, e) => sum + (e.value || 0), 0),
    payCount: pay.length,
    sponsorCount: active.length - pay.length,
    cancelledCount: inMonth.length - active.length,
  };
}

const thDate = (d: string) =>
  new Date(d + "T00:00").toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

/** Date range label, e.g. "พ. 5 พ.ย. 69" or "พฤ. 12 พ.ย. 69 – ศ. 13 พ.ย. 69". */
export const dateRange = (e: CalEvent) =>
  e.endDate && e.endDate > e.date ? `${thDate(e.date)} – ${thDate(e.endDate)}` : thDate(e.date);

/**
 * Plain-text brief to paste into LINE / chat for the team.
 * Leaves out value, QT and BL: those are for the office, not the field team.
 */
export function teamMessage(e: CalEvent): string {
  const lines = [`📌 ${e.title || "Event"}`, `📅 ${dateRange(e)}`];
  if (e.customer) lines.push(`🏢 ${e.customer}`);
  if (e.location) lines.push(`📍 ${e.location}`);
  for (const r of ["stage", "exhibitor"] as Role[]) {
    const ppl = e.team.filter((t) => t.role === r).map((t) => t.name);
    if (ppl.length) lines.push(`👥 ${ROLE_LABEL[r]}: ${ppl.join(", ")}`);
  }
  if (e.details) lines.push("", e.details);
  const c = e.contact;
  if (hasContact(c)) {
    lines.push("", "☎️ ติดต่อลูกค้า");
    if (c.name) lines.push(`ชื่อ: ${c.name}`);
    if (c.phone) lines.push(`โทร: ${c.phone}`);
    if (c.line) lines.push(`LINE: ${c.line}`);
    if (c.email) lines.push(`Email: ${c.email}`);
  }
  if (e.url) lines.push("", `🔗 ${e.url}`);
  return lines.join("\n");
}

/** Case-insensitive search over the text fields people look things up by. */
export function matchesQuery(e: CalEvent, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const c = e.contact;
  return [
    e.title,
    e.customer,
    e.location,
    e.details,
    e.qt,
    e.bl,
    STATUS_LABEL[e.status],
    TYPE_LABEL[e.type],
    c.name,
    c.phone,
    c.line,
    c.email,
    ...e.team.map((t) => t.name),
  ].some((v) => v && v.toLowerCase().includes(needle));
}

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

/** A multi-day event's bar within one week row. Columns are 0 (Mon) – 6 (Sun). */
export type Segment = {
  e: CalEvent;
  start: number;
  end: number;
  lane: number;
  /** The event started before this row / carries on after it. */
  contLeft: boolean;
  contRight: boolean;
};

/**
 * Lay out multi-day events as bars across one week. `visible` marks the columns
 * bars may use (the days of the viewed month, which are contiguous). Each bar
 * gets the first free lane, so overlapping events stack instead of colliding.
 */
export function weekSegments(events: CalEvent[], days: Date[], visible: boolean[]) {
  const keys = days.map(ymd);
  const cols = keys.map((_, i) => i).filter((i) => visible[i]);
  if (!cols.length) return { segs: [] as Segment[], lanes: 0 };
  const first = keys[cols[0]!]!;
  const last = keys[cols[cols.length - 1]!]!;
  const raw: Omit<Segment, "lane">[] = [];
  for (const e of events) {
    const end = e.endDate && e.endDate > e.date ? e.endDate : null;
    if (!end || end < first || e.date > last) continue;
    const s = e.date > first ? e.date : first;
    const t = end < last ? end : last;
    raw.push({
      e,
      start: keys.indexOf(s),
      end: keys.indexOf(t),
      contLeft: e.date < s,
      contRight: end > t,
    });
  }
  raw.sort(
    (a, b) =>
      a.start - b.start || b.end - b.start - (a.end - a.start) || a.e.date.localeCompare(b.e.date),
  );
  const laneEnds: number[] = [];
  const segs: Segment[] = raw.map((r) => {
    let lane = laneEnds.findIndex((x) => x < r.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(r.end);
    } else laneEnds[lane] = r.end;
    return { ...r, lane };
  });
  return { segs, lanes: laneEnds.length };
}

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
