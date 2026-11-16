import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Link2, Plus, Users } from "lucide-react";
import { type CalEvent, monthWeeks, ymd } from "@/lib/events";

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
  const weeks = monthWeeks(cur.y, cur.m);
  const byDate = events.reduce<Record<string, CalEvent[]>>((a, e) => {
    (a[e.date] ||= []).push(e);
    return a;
  }, {});
  const shift = (d: number) => {
    const n = new Date(cur.y, cur.m + d, 1);
    setCur({ y: n.getFullYear(), m: n.getMonth() });
  };
  const label = new Date(cur.y, cur.m, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const today = ymd(now);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-4xl text-foreground">{label}</h2>
        <div className="flex gap-2">
          <button onClick={() => shift(-1)} className="cal-nav" aria-label="เดือนก่อน"><ChevronLeft size={18} /></button>
          <button onClick={() => setCur({ y: now.getFullYear(), m: now.getMonth() })} className="cal-nav px-3 text-sm">วันนี้</button>
          <button onClick={() => shift(1)} className="cal-nav" aria-label="เดือนถัดไป"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="space-y-2">
        {weeks.map((week, wi) => {
          const cols = week.map((d) => (d && byDate[ymd(d)] ? "minmax(0,4fr)" : "minmax(0,1fr)")).join(" ");
          return (
            <div key={wi}>
              {wi === 0 && (
                <div className="mb-1 grid gap-2" style={{ gridTemplateColumns: cols }}>
                  {TH_DAYS.map((d) => (
                    <div key={d} className="text-center text-xs uppercase tracking-widest text-muted-foreground">{d}</div>
                  ))}
                </div>
              )}
              <div className="grid gap-2 transition-all" style={{ gridTemplateColumns: cols }}>
                {week.map((d, di) => {
                  if (!d) return <div key={di} />;
                  const key = ymd(d);
                  const evs = byDate[key];
                  return (
                    <div key={di} className={evs ? "cal-day-full" : "cal-day-empty"} data-today={key === today}>
                      <div className="flex items-center justify-between">
                        <span className="cal-num">{d.getDate()}</span>
                        {!readOnly && (
                          <button onClick={() => onAdd?.(key)} className="cal-add" aria-label="เพิ่ม event"><Plus size={14} /></button>
                        )}
                      </div>
                      {evs?.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => !readOnly && onEdit?.(e)}
                          className={`mt-2 space-y-2 rounded-md bg-card p-3 text-left shadow-sm ${readOnly ? "" : "cursor-pointer hover:ring-2 hover:ring-primary/40"}`}
                        >
                          <div className="font-semibold leading-tight text-card-foreground">{e.title || "Event"}</div>
                          {e.location && (
                            <div className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin size={14} className="mt-0.5 shrink-0" />{e.location}</div>
                          )}
                          {e.details && <p className="whitespace-pre-wrap text-sm text-foreground/80">{e.details}</p>}
                          {e.team.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Users size={14} className="text-primary" />
                              {e.team.map((t) => <span key={t} className="team-chip">{t}</span>)}
                            </div>
                          )}
                          {e.url && (
                            <a href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 truncate text-sm text-primary underline">
                              <Link2 size={14} className="shrink-0" />เปิดลิงก์ Google
                            </a>
                          )}
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
