import { Fragment, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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
  type Status,
  ROLE_LABEL,
  STATUSES,
  STATUS_LABEL,
  TYPE_LABEL,
  baht,
  dateRange,
  eventsByDay,
  hasContact,
  lineUrl,
  matchesQuery,
  monthSummary,
  monthWeeks,
  teamMessage,
  ymd,
} from "@/lib/events";

const TH_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

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
  const filtering = !!query.trim() || !!status;
  const shown = events.filter((e) => matchesQuery(e, query) && (!status || e.status === status));
  const weeks = monthWeeks(cur.y, cur.m);
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
  const monthPrefix = `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-`;
  // Table: the viewed month, or every match across months while searching.
  const tableRows = (
    query.trim() ? shown : shown.filter((e) => e.date.startsWith(monthPrefix))
  ).sort((a, b) => a.date.localeCompare(b.date));
  const isThisMonth = cur.y === now.getFullYear() && cur.m === now.getMonth();
  const monthDays = weeks.flat().filter((d): d is Date => !!d);
  const agendaDays = monthDays.filter((d) => byDate[ymd(d)]);

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
        </div>
      </div>

      {view === "table" && (
        <EventTable
          rows={tableRows}
          allMonths={!!query.trim()}
          readOnly={readOnly}
          onEdit={onEdit}
        />
      )}

      {/* Mobile: agenda list of days that have events */}
      <div className={view === "calendar" ? "space-y-5 md:hidden" : "hidden"}>
        {agendaDays.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {filtering ? "ไม่พบ event ที่ตรงกับที่ค้นหาในเดือนนี้" : "ยังไม่มี event ในเดือนนี้"}
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
                    className="cal-add opacity-100"
                    aria-label="เพิ่ม event วันนี้"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {byDate[key]!.map(({ e, day, total }) => (
                  <EventCard
                    key={e.id}
                    e={e}
                    day={day}
                    total={total}
                    readOnly={readOnly}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {!readOnly && (
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

      {/* Desktop / tablet: month grid */}
      <div className={view === "calendar" ? "hidden space-y-2 md:block" : "hidden"}>
        {weeks.map((week, wi) => {
          const cols = week
            .map((d) => (d && byDate[ymd(d)] ? "minmax(0,4fr)" : "minmax(0,1fr)"))
            .join(" ");
          return (
            <div key={wi}>
              {wi === 0 && (
                <div className="mb-1 grid gap-2" style={{ gridTemplateColumns: cols }}>
                  {TH_DAYS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2 transition-all" style={{ gridTemplateColumns: cols }}>
                {week.map((d, di) => {
                  if (!d) return <div key={di} />;
                  const key = ymd(d);
                  const evs = byDate[key];
                  return (
                    <div
                      key={di}
                      className={evs ? "cal-day-full" : "cal-day-empty"}
                      data-today={key === today}
                    >
                      <div className="flex items-center justify-between">
                        <span className="cal-num">{d.getDate()}</span>
                        {!readOnly && (
                          <button
                            onClick={() => onAdd?.(key)}
                            className="cal-add"
                            aria-label="เพิ่ม event"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      {evs?.map(({ e, day, total }) => (
                        <div key={e.id} className="mt-2">
                          <EventCard
                            e={e}
                            day={day}
                            total={total}
                            readOnly={readOnly}
                            onEdit={onEdit}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact card; click the header to expand details, contact and actions. */
function EventCard({
  e,
  day,
  total,
  readOnly,
  onEdit,
}: {
  e: CalEvent;
  day: number;
  total: number;
  readOnly?: boolean | undefined;
  onEdit?: ((e: CalEvent) => void) | undefined;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-md bg-card text-left shadow-sm ring-1 ring-border/60 ${open ? "ring-2 ring-primary/40" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="font-semibold leading-tight text-card-foreground">
            {e.title || "Event"}
          </div>
          {e.customer && <div className="truncate text-sm text-foreground/80">{e.customer}</div>}
          <div className="flex flex-wrap items-center gap-1">
            <StatusChip status={e.status} />
            <span className={e.type === "pay" ? "type-chip-pay" : "type-chip-sponsor"}>
              {TYPE_LABEL[e.type]}
            </span>
            {total > 1 && (
              <span className="day-chip">
                วันที่ {day}/{total}
              </span>
            )}
            {e.type === "pay" && e.value != null && (
              <span className="text-xs font-semibold text-foreground">{baht(e.value)}</span>
            )}
          </div>
          {e.location && (
            <div className="flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span className="truncate">{e.location}</span>
            </div>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-3">
          <EventDetails e={e} readOnly={readOnly} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  return <span className={`status-chip status-${status}`}>{STATUS_LABEL[status]}</span>;
}

/** Table of events; click a row to expand its details underneath. */
function EventTable({
  rows,
  allMonths,
  readOnly,
  onEdit,
}: {
  rows: CalEvent[];
  allMonths: boolean;
  readOnly?: boolean | undefined;
  onEdit?: ((e: CalEvent) => void) | undefined;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const shortDate = (d: string) =>
    new Date(d + "T00:00").toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  return (
    <div className="space-y-2">
      {allMonths && (
        <p className="text-xs text-muted-foreground">
          กำลังค้นหาทุกเดือน · พบ {rows.length} รายการ
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">วันที่</th>
              <th className="px-3 py-2 font-medium">ชื่องาน</th>
              <th className="px-3 py-2 font-medium">ลูกค้า</th>
              <th className="px-3 py-2 font-medium">สถานะ</th>
              <th className="px-3 py-2 font-medium">ประเภท</th>
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
              const open = openId === e.id;
              const c = e.contact;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setOpenId(open ? null : e.id)}
                    className={`cursor-pointer border-t border-border align-top hover:bg-secondary/40 ${open ? "bg-secondary/40" : ""}`}
                    aria-expanded={open}
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
                      <span className="inline-flex items-center gap-1">
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                        />
                        {e.title || "Event"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {e.customer || <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={e.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={e.type === "pay" ? "type-chip-pay" : "type-chip-sponsor"}>
                        {TYPE_LABEL[e.type]}
                      </span>
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
                  {open && (
                    <tr className="bg-secondary/20">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="max-w-xl">
                          <EventDetails e={e} readOnly={readOnly} onEdit={onEdit} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-border bg-secondary/40 text-sm font-semibold">
              <tr>
                <td colSpan={5} className="px-3 py-2">
                  รวม Pay ({rows.filter((r) => r.type === "pay").length} งาน)
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {baht(rows.reduce((s, r) => s + (r.type === "pay" ? r.value || 0 : 0), 0))}
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

/** Expanded content shared by card and table: details, team, contact, actions. */
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
