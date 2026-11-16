import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  Table2,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  type CalEvent,
  type Role,
  type Segment,
  type Status,
  ROLE_LABEL,
  ROLE_SHORT,
  STATUSES,
  STATUS_LABEL,
  TYPE_LABEL,
  baht,
  dateRange,
  eventsByDay,
  hasContact,
  isActive,
  lineUrl,
  matchesQuery,
  monthSummary,
  monthWeeks,
  teamMessage,
  valueBadge,
  weekSegments,
  ymd,
} from "@/lib/events";

const TH_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

/** Left accent colour per status, so the pipeline stage reads at a glance. */
const STATUS_BAR: Record<Status, string> = {
  talking: "border-l-slate-400",
  pitch: "border-l-sky-500",
  demo: "border-l-violet-500",
  deciding: "border-l-amber-500",
  confirmed: "border-l-teal-500",
  wait_qt: "border-l-orange-500",
  qt_sent: "border-l-indigo-500",
  wait_bill: "border-l-rose-500",
  paid: "border-l-emerald-600",
  cancelled: "border-l-zinc-300",
};

export function Calendar({
  events,
  readOnly,
  onAdd,
  onEdit,
}: {
  events: CalEvent[];
  readOnly?: boolean;
  onAdd?: (date: string) => void;
  onEdit?: (e: CalEvent) => void;
}) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((e) => e.id === selectedId) || null;

  const filtering = !!query.trim() || !!status;
  const shown = events.filter((e) => matchesQuery(e, query) && (!status || e.status === status));
  const byDate = eventsByDay(shown);
  const shift = (d: number) => {
    const n = new Date(cur.y, cur.m + d, 1);
    setCur({ y: n.getFullYear(), m: n.getMonth() });
  };
  const label = new Date(cur.y, cur.m, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const today = ymd(now);
  const sum = monthSummary(shown, cur.y, cur.m);
  const isThisMonth = cur.y === now.getFullYear() && cur.m === now.getMonth();

  // Full Mon-first grid including the faded days of the neighbouring months.
  const weekCount = monthWeeks(cur.y, cur.m).length;
  const lead = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7;
  const cells = Array.from(
    { length: weekCount * 7 },
    (_, i) => new Date(cur.y, cur.m, 1 - lead + i),
  );
  const monthDays = cells.filter((d) => d.getMonth() === cur.m);
  const agendaDays = monthDays.filter((d) => byDate[ymd(d)]);

  const monthPrefix = `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-`;
  // Table: the viewed month, or every match across months while searching.
  const tableRows = (
    query.trim() ? shown : shown.filter((e) => e.date.startsWith(monthPrefix))
  ).sort((a, b) => a.date.localeCompare(b.date));
  const openEvent = (e: CalEvent) => setSelectedId(e.id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
        <h2 className="font-display text-2xl text-foreground sm:text-4xl">{label}</h2>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => shift(-1)} className="cal-nav" aria-label="เดือนก่อน">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCur({ y: now.getFullYear(), m: now.getMonth() })}
            className="cal-nav px-3 text-sm"
          >
            วันนี้
          </button>
          <button onClick={() => shift(1)} className="cal-nav" aria-label="เดือนถัดไป">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="มุมมอง">
          <button
            type="button"
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays size={15} />
            ปฏิทิน
          </button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
            <Table2 size={15} />
            ตาราง
          </button>
        </div>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            enterKeyHint="search"
            className="inp pl-9 pr-8"
            placeholder="ค้นหา ชื่องาน ลูกค้า ผู้ติดต่อ ทีม QT/BL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="ค้นหา event"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
              aria-label="ล้างคำค้น"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          className="inp w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | "")}
          aria-label="กรองตามสถานะ"
        >
          <option value="">ทุกสถานะ</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3"
        aria-label="สรุปยอดเดือนนี้"
      >
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-primary" />
          <span className="text-sm text-muted-foreground">
            ยอด Pay รวมเดือนนี้{filtering && " (ตามที่กรอง)"}
          </span>
          <span className="font-display text-2xl text-foreground">{baht(sum.total)}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="type-chip-pay">Pay {sum.payCount} งาน</span>
          <span className="type-chip-sponsor">Sponsor {sum.sponsorCount} งาน</span>
          {sum.cancelledCount > 0 && (
            <span className="status-chip status-cancelled">ยกเลิก {sum.cancelledCount} งาน</span>
          )}
        </div>
      </div>

      {view === "table" && (
        <EventTable rows={tableRows} allMonths={!!query.trim()} onOpen={openEvent} />
      )}

      {view === "calendar" && (
        <>
          {/* Mobile: agenda list of days that have events */}
          <div className="space-y-5 md:hidden">
            {agendaDays.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {filtering
                  ? "ไม่พบ event ที่ตรงกับที่ค้นหาในเดือนนี้"
                  : "ยังไม่มี event ในเดือนนี้"}
              </p>
            )}
            {agendaDays.map((d) => {
              const key = ymd(d);
              return (
                <section key={key}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3
                      className={`text-sm font-semibold ${key === today ? "text-primary" : "text-foreground"}`}
                    >
                      {d.toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                      {key === today && <span className="ml-2 day-chip">วันนี้</span>}
                    </h3>
                    {!readOnly && (
                      <button
                        onClick={() => onAdd?.(key)}
                        className="cal-nav h-8 min-w-8"
                        aria-label="เพิ่ม event วันนี้"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {byDate[key]!.map(({ e, day, total }) => (
                      <EventPill key={e.id} e={e} day={day} total={total} onOpen={openEvent} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Desktop / tablet: month grid, 7 equal columns so dates always line up */}
          <div className="hidden md:block">
            <div className="mb-1 grid grid-cols-7 gap-1.5">
              {TH_DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`py-1 text-center text-xs font-medium uppercase tracking-widest ${i >= 5 ? "text-primary/70" : "text-muted-foreground"}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: weekCount }, (_, wi) => {
                const days = cells.slice(wi * 7, wi * 7 + 7);
                const visible = days.map((d) => d.getMonth() === cur.m);
                const { segs, lanes } = weekSegments(shown, days, visible);
                const barCols = new Set(
                  segs.flatMap((sg) =>
                    Array.from({ length: sg.end - sg.start + 1 }, (_, k) => sg.start + k),
                  ),
                );
                return (
                  <div
                    key={wi}
                    className="grid grid-cols-7 gap-x-1.5 gap-y-1"
                    style={{
                      gridTemplateRows: ["auto", ...Array<string>(lanes).fill("auto"), "1fr"].join(
                        " ",
                      ),
                    }}
                  >
                    {/* Day boxes: span every row so bars sit on top of them */}
                    {days.map((d, c) => {
                      const key = ymd(d);
                      const inMonth = visible[c];
                      const singles = inMonth
                        ? (byDate[key] || []).filter((x) => x.total === 1)
                        : [];
                      return (
                        <div
                          key={key}
                          className="cal-cell group relative"
                          style={{ gridColumn: c + 1, gridRow: "1 / -1" }}
                          data-today={key === today}
                          data-out={!inMonth}
                          data-weekend={c >= 5}
                          data-busy={singles.length > 0 || barCols.has(c)}
                        >
                          <div className="flex h-6 items-center justify-between">
                            <span className="cal-num">{d.getDate()}</span>
                            {!readOnly && inMonth && (
                              <button
                                onClick={() => onAdd?.(key)}
                                className="cal-add"
                                aria-label={`เพิ่ม event วันที่ ${d.getDate()}`}
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Row 1 keeps room for the date numbers */}
                    <div
                      className="pointer-events-none h-7"
                      style={{ gridColumn: "1 / -1", gridRow: 1 }}
                    />
                    {/* Multi-day bars */}
                    {segs.map((sg) => (
                      <SpanBar
                        key={sg.e.id}
                        sg={sg}
                        onOpen={openEvent}
                        style={{
                          gridColumn: `${sg.start + 1} / ${sg.end + 2}`,
                          gridRow: sg.lane + 2,
                        }}
                      />
                    ))}
                    {/* Single-day events */}
                    {days.map((d, c) => {
                      const singles = visible[c]
                        ? (byDate[ymd(d)] || []).filter((x) => x.total === 1)
                        : [];
                      return (
                        <div
                          key={"s" + c}
                          className="relative min-h-16 space-y-1.5 px-1.5 pb-1.5"
                          style={{ gridColumn: c + 1, gridRow: lanes + 2 }}
                        >
                          {singles.map(({ e }) => (
                            <EventPill
                              key={e.id}
                              e={e}
                              day={1}
                              total={1}
                              onOpen={openEvent}
                              compact
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!readOnly && view === "calendar" && (
        <div className="md:hidden">
          <button
            onClick={() => onAdd?.(isThisMonth ? today : ymd(new Date(cur.y, cur.m, 1)))}
            className="btn-primary fixed bottom-5 right-5 z-40 h-14 w-14 justify-center p-0 shadow-lg"
            aria-label="เพิ่ม event"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {selected && (
        <EventSheet
          e={selected}
          readOnly={readOnly}
          onClose={() => setSelectedId(null)}
          onEdit={(e) => {
            setSelectedId(null);
            onEdit?.(e);
          }}
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  return <span className={`status-chip status-${status}`}>{STATUS_LABEL[status]}</span>;
}

/** Team names grouped by role, always visible on the collapsed card. */
function TeamLine({ e, compact }: { e: CalEvent; compact?: boolean | undefined }) {
  const rows = (["stage", "exhibitor"] as Role[])
    .map((r) => ({ r, ppl: e.team.filter((t) => t.role === r) }))
    .filter((x) => x.ppl.length);
  if (!rows.length) return null;
  return (
    <div className="space-y-1">
      {rows.map(({ r, ppl }) => (
        <div key={r} className="flex flex-wrap items-center gap-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${compact ? "w-full" : "mr-0.5"}`}
          >
            {ROLE_SHORT[r]}
          </span>
          {ppl.map((t) => (
            <span key={t.name} className={r === "stage" ? "team-chip" : "team-chip-alt"}>
              {t.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Collapsed event: title, customer, status, team. Click opens the detail sheet. */
function EventPill({
  e,
  day,
  total,
  onOpen,
  compact,
}: {
  e: CalEvent;
  day: number;
  total: number;
  onOpen: (e: CalEvent) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      className={`block w-full space-y-1.5 rounded-md border border-border/70 border-l-4 bg-card text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${STATUS_BAR[e.status]} ${compact ? "p-2" : "p-3"} ${isActive(e) ? "" : "opacity-60"}`}
    >
      <div
        className={`font-semibold leading-snug text-card-foreground ${compact ? "line-clamp-2 text-[13px]" : ""} ${isActive(e) ? "" : "line-through"}`}
      >
        {e.title || "Event"}
      </div>
      {e.customer && (
        <div className={`truncate text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {e.customer}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <StatusChip status={e.status} />
        {total > 1 && (
          <span className="day-chip">
            {day}/{total}
          </span>
        )}
        <ValueBadge e={e} />
      </div>
      {!compact && e.location && (
        <div className="flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <span className="truncate">{e.location}</span>
        </div>
      )}
      <TeamLine e={e} compact={compact} />
    </button>
  );
}

/** "50k" for pay with a value, "SPR" for sponsor. */
function ValueBadge({ e }: { e: CalEvent }) {
  const v = valueBadge(e);
  if (!v) return null;
  return (
    <span
      className={e.type === "pay" ? "type-chip-pay tabular-nums" : "type-chip-sponsor"}
      title={e.type === "pay" && e.value != null ? baht(e.value) : TYPE_LABEL[e.type]}
    >
      {v}
    </span>
  );
}

/** A multi-day event drawn across its days in one week row. */
function SpanBar({
  sg,
  onOpen,
  style,
}: {
  sg: Segment;
  onOpen: (e: CalEvent) => void;
  style: React.CSSProperties;
}) {
  const { e, contLeft, contRight } = sg;
  const short = (d: string) =>
    new Date(d + "T00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const live = e.team.filter((t) => t.role === "stage");
  const booth = e.team.filter((t) => t.role === "exhibitor");
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      style={style}
      className={[
        "relative z-[1] min-w-0 space-y-1 border border-border/70 bg-card px-2 py-1.5 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        contLeft
          ? "-ml-px rounded-l-none border-l-0"
          : `ml-1.5 rounded-l-md border-l-4 ${STATUS_BAR[e.status]}`,
        contRight ? "-mr-px rounded-r-none border-r-0" : "mr-1.5 rounded-r-md",
        isActive(e) ? "" : "opacity-60",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {contLeft && <ChevronLeft size={13} className="shrink-0 text-muted-foreground" />}
        <span
          className={`truncate text-[13px] font-semibold text-card-foreground ${isActive(e) ? "" : "line-through"}`}
        >
          {e.title || "Event"}
        </span>
        {e.customer && (
          <span className="min-w-0 shrink-[3] truncate text-xs text-muted-foreground">
            · {e.customer}
          </span>
        )}
        {contRight && <ChevronRight size={13} className="ml-auto shrink-0 text-muted-foreground" />}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <ValueBadge e={e} />
        <StatusChip status={e.status} />
        <span className="day-chip">
          {short(e.date)} – {short(e.endDate!)}
        </span>
        {(live.length > 0 || booth.length > 0) && (
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        )}
        {live.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {ROLE_SHORT.stage}
          </span>
        )}
        {live.map((t) => (
          <span key={"l" + t.name} className="team-chip">
            {t.name}
          </span>
        ))}
        {booth.length > 0 && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${live.length ? "ml-1.5" : ""}`}
          >
            {ROLE_SHORT.exhibitor}
          </span>
        )}
        {booth.map((t) => (
          <span key={"b" + t.name} className="team-chip-alt">
            {t.name}
          </span>
        ))}
      </div>
    </button>
  );
}

/** Side panel on desktop, bottom sheet on mobile. */
function EventSheet({
  e,
  readOnly,
  onClose,
  onEdit,
}: {
  e: CalEvent;
  readOnly?: boolean | undefined;
  onClose: () => void;
  onEdit: (e: CalEvent) => void;
}) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-foreground/30 md:items-stretch md:justify-end"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={e.title || "Event"}
        onClick={(ev) => ev.stopPropagation()}
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-h-none md:w-[440px] md:rounded-none md:p-6"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="font-display text-2xl leading-tight">{e.title || "Event"}</h3>
            {e.customer && <div className="text-sm text-foreground/80">{e.customer}</div>}
            <div className="flex flex-wrap items-center gap-1">
              <StatusChip status={e.status} />
              <span className={e.type === "pay" ? "type-chip-pay" : "type-chip-sponsor"}>
                {TYPE_LABEL[e.type]}
              </span>
              {e.type === "pay" && e.value != null && (
                <span className="text-sm font-semibold">{baht(e.value)}</span>
              )}
            </div>
            {e.location && (
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                {e.location}
              </div>
            )}
          </div>
          <button onClick={onClose} className="cal-nav shrink-0" aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <EventDetails e={e} readOnly={readOnly} onEdit={onEdit} />
      </aside>
    </div>
  );
}

/** Table of events; click a row to open its details. */
function EventTable({
  rows,
  allMonths,
  onOpen,
}: {
  rows: CalEvent[];
  allMonths: boolean;
  onOpen: (e: CalEvent) => void;
}) {
  const shortDate = (d: string) =>
    new Date(d + "T00:00").toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  const teamOf = (e: CalEvent, r: Role) =>
    e.team
      .filter((t) => t.role === r)
      .map((t) => t.name)
      .join(", ");
  return (
    <div className="space-y-2">
      {allMonths && (
        <p className="text-xs text-muted-foreground">
          กำลังค้นหาทุกเดือน · พบ {rows.length} รายการ
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">วันที่</th>
              <th className="px-3 py-2 font-medium">ชื่องาน</th>
              <th className="px-3 py-2 font-medium">ลูกค้า</th>
              <th className="px-3 py-2 font-medium">สถานะ</th>
              <th className="px-3 py-2 font-medium">ทีม</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 font-medium">QT / BL</th>
              <th className="px-3 py-2 font-medium">ผู้ติดต่อ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  ไม่มี event
                </td>
              </tr>
            )}
            {rows.map((e) => {
              const c = e.contact;
              const live = teamOf(e, "stage");
              const booth = teamOf(e, "exhibitor");
              return (
                <tr
                  key={e.id}
                  onClick={() => onOpen(e)}
                  onKeyDown={(ev) =>
                    (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onOpen(e))
                  }
                  tabIndex={0}
                  className={`cursor-pointer border-t border-border align-top hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none ${isActive(e) ? "" : "opacity-50"}`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {shortDate(e.date)}
                    {e.endDate && e.endDate > e.date && (
                      <div className="text-xs text-muted-foreground">
                        ถึง {shortDate(e.endDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    {e.title || "Event"}
                    <div className="mt-0.5">
                      <span className={e.type === "pay" ? "type-chip-pay" : "type-chip-sponsor"}>
                        {TYPE_LABEL[e.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {e.customer || <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={e.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {live && (
                      <div>
                        <span className="text-muted-foreground">{ROLE_SHORT.stage}: </span>
                        {live}
                      </div>
                    )}
                    {booth && (
                      <div>
                        <span className="text-muted-foreground">{ROLE_SHORT.exhibitor}: </span>
                        {booth}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {e.type === "pay" && e.value != null ? (
                      baht(e.value)
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {e.qt && <div>QT: {e.qt}</div>}
                    {e.bl && <div>BL: {e.bl}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.name && <div>{c.name}</div>}
                    {c.phone && <div className="text-muted-foreground">{c.phone}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-border bg-secondary/40 text-sm font-semibold">
              <tr>
                <td colSpan={5} className="px-3 py-2">
                  รวม Pay ({rows.filter((r) => r.type === "pay" && isActive(r)).length} งาน ·
                  ไม่รวมที่ยกเลิก)
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {baht(
                    rows.reduce(
                      (s, r) => s + (r.type === "pay" && isActive(r) ? r.value || 0 : 0),
                      0,
                    ),
                  )}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/** Full details: date, QT/BL, notes, team, contact, actions. */
function EventDetails({
  e,
  readOnly,
  onEdit,
}: {
  e: CalEvent;
  readOnly?: boolean | undefined;
  onEdit?: ((e: CalEvent) => void) | undefined;
}) {
  const [sent, setSent] = useState(false);
  const sendToTeam = async () => {
    const text = teamMessage(e);
    try {
      if (navigator.share) {
        await navigator.share({ title: e.title || "Event", text });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user closed the share sheet
    }
    await navigator.clipboard.writeText(text);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };
  const c = e.contact;
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{dateRange(e)}</div>
      {e.type === "pay" && (e.qt || e.bl) && (
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <FileText size={12} className="shrink-0" />
          {e.qt && <span>QT: {e.qt}</span>}
          {e.bl && <span>BL: {e.bl}</span>}
        </div>
      )}
      {e.details && <p className="whitespace-pre-wrap text-sm text-foreground/80">{e.details}</p>}
      {(["stage", "exhibitor"] as Role[]).map((r) => {
        const ppl = e.team.filter((t) => t.role === r);
        if (!ppl.length) return null;
        return (
          <div key={r} className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users size={12} className="text-primary" />
              {ROLE_LABEL[r]}
            </div>
            <div className="flex flex-wrap gap-1">
              {ppl.map((t) => (
                <span key={t.name} className={r === "stage" ? "team-chip" : "team-chip-alt"}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {hasContact(c) && (
        <div className="space-y-1.5 rounded-md bg-secondary/60 p-2.5 text-sm">
          <div className="text-xs font-medium text-muted-foreground">ติดต่อลูกค้า</div>
          {c.name && (
            <div className="flex items-center gap-2">
              <User size={14} className="shrink-0 text-primary" />
              {c.name}
            </div>
          )}
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-2 text-primary underline"
            >
              <Phone size={14} className="shrink-0" />
              {c.phone}
            </a>
          )}
          {c.line && (
            <a
              href={lineUrl(c.line)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-primary underline"
            >
              <MessageCircle size={14} className="shrink-0" />
              LINE: {c.line}
            </a>
          )}
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="flex items-center gap-2 break-all text-primary underline"
            >
              <Mail size={14} className="shrink-0" />
              {c.email}
            </a>
          )}
        </div>
      )}

      {e.url && (
        <a
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 truncate text-sm text-primary underline"
        >
          <Link2 size={14} className="shrink-0" />
          เปิดลิงก์ Google
        </a>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={sendToTeam} className="btn-soft">
          {sent ? <Check size={14} /> : <Send size={14} />}
          {sent ? "คัดลอกแล้ว วางใน LINE ได้เลย" : "ส่งให้ทีม"}
        </button>
        {!readOnly && (
          <button type="button" onClick={() => onEdit?.(e)} className="btn-soft">
            <Pencil size={14} />
            แก้ไข
          </button>
        )}
      </div>
    </div>
  );
}
