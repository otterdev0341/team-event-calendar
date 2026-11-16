import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Palette, Share2, Trash2, Wrench, X } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { type CalEvent, type Contact, type EventType, type Role, type Status, COLOR_PRESETS, ROLE_LABEL, STATUSES, STATUS_LABEL, TYPE_LABEL, emptyContact, encodeEvents, eventDays, isRealName, loadEvents, normalize, saveEvents } from "@/lib/events";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Event Calendar — team and venue planning" },
      { name: "description", content: "Event calendar with venues, details and team, shareable as read-only" },
      { property: "og:title", content: "Event Calendar" },
      { property: "og:description", content: "Plan events and team, share a read-only calendar" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const names = (e: CalEvent, r: Role) => e.team.filter((t) => t.role === r).map((t) => t.name).join(", ");
const blank = (date: string): CalEvent => ({ id: crypto.randomUUID(), date, title: "", location: "", details: "", team: [], url: "", type: "pay", qt: "", bl: "", customer: "", status: "talking", contact: emptyContact() });

function Index() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [teamText, setTeamText] = useState<Record<Role, string>>({ stage: "", exhibitor: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => { setEvents(loadEvents()); setReady(true); }, []);
  useEffect(() => { if (ready) saveEvents(events); }, [events, ready]);

  const open = (e: CalEvent) => { setEditing(e); setTeamText({ stage: names(e, "stage"), exhibitor: names(e, "exhibitor") }); };
  const setContact = (c: Partial<Contact>) => editing && setEditing({ ...editing, contact: { ...editing.contact, ...c } });
  const save = () => {
    if (!editing) return;
    const split = (r: Role) => teamText[r].split(",").map((s) => s.trim()).filter(isRealName).map((name) => ({ name, role: r }));
    // normalize drops setup days outside the date range and invalid colours
    const ev: CalEvent = normalize({ ...editing, team: [...split("stage"), ...split("exhibitor")] });
    if (ev.type === "sponsor") { delete ev.value; delete ev.qt; delete ev.bl; }
    setEvents((p) => [...p.filter((x) => x.id !== ev.id), ev]);
    setEditing(null);
  };
  const share = async () => {
    const url = `${location.origin}/view#${encodeEvents(events)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Event Planner</p>
          <h1 className="font-display text-3xl text-foreground sm:text-5xl">Event Calendar</h1>
        </div>
        <button onClick={share} className="btn-primary"><Share2 size={16} />{copied ? "Link copied!" : "Share read-only"}</button>
      </header>
      <Calendar events={events} onAdd={(d) => open(blank(d))} onEdit={open} onDelete={(e) => setEvents((p) => p.filter((x) => x.id !== e.id))} />
      <p className="mt-6 text-xs text-muted-foreground">Data is saved in this browser · A share link is a snapshot at the time you share (share again after edits) · <Link to="/view" className="underline">Open read-only view</Link></p>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Event</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Start date"><input type="date" className="inp" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="End date (multi-day)"><input type="date" className="inp" min={editing.date} value={editing.endDate || ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></Field>
            </div>
            {editing.endDate && editing.endDate > editing.date && (
              <Field label="Setup days (load-in) — tap to select">
                <div className="flex flex-wrap gap-1.5">
                  {eventDays(editing).map((d) => {
                    const on = !!editing.setupDays?.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            setupDays: on ? editing.setupDays!.filter((x) => x !== d) : [...(editing.setupDays || []), d].sort(),
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${on ? "border-zinc-800 bg-zinc-800 text-white" : "border-input bg-background text-foreground hover:bg-secondary"}`}
                      >
                        {on && <Wrench size={11} />}
                        {new Date(d + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
            <Field label="Event name"><input className="inp" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Client / company"><input className="inp" placeholder="e.g. ABC Co., Ltd." value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} /></Field>
              <Field label="Status">
                <select className="inp" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Status })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Calendar colour">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, color: undefined })}
                  aria-pressed={!editing.color}
                  className={`rounded-full border px-2.5 py-1 text-xs ${!editing.color ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-secondary"}`}
                >
                  By status
                </button>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    aria-label={`Colour ${c}`}
                    aria-pressed={editing.color === c}
                    className="grid h-7 w-7 place-items-center rounded-full ring-offset-2 ring-offset-card aria-pressed:ring-2 aria-pressed:ring-foreground"
                    style={{ backgroundColor: c }}
                  >
                    {editing.color === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
                <label
                  className={`relative grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-input ${editing.color && !(COLOR_PRESETS as readonly string[]).includes(editing.color) ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
                  style={{ background: editing.color && !(COLOR_PRESETS as readonly string[]).includes(editing.color) ? editing.color : "conic-gradient(#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)" }}
                  title="Custom colour"
                >
                  <Palette size={13} className="text-white drop-shadow" />
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={editing.color || "#3b82f6"}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    aria-label="Custom colour"
                  />
                </label>
              </div>
            </Field>
            <Field label="Type">
              <div className="flex gap-2">
                {(["pay", "sponsor"] as EventType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditing({ ...editing, type: t })}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${editing.type === t ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-secondary"}`}
                    aria-pressed={editing.type === t}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </Field>
            {editing.type === "pay" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Value (THB)">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="inp"
                    placeholder="0"
                    value={editing.value ?? ""}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </Field>
                <Field label="QT"><input className="inp" placeholder="Quotation no." value={editing.qt || ""} onChange={(e) => setEditing({ ...editing, qt: e.target.value })} /></Field>
                <Field label="BL"><input className="inp" placeholder="BL no." value={editing.bl || ""} onChange={(e) => setEditing({ ...editing, bl: e.target.value })} /></Field>
              </div>
            )}
            <Field label="Location"><input className="inp" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Field>
            <Field label="Details"><textarea rows={3} className="inp" value={editing.details} onChange={(e) => setEditing({ ...editing, details: e.target.value })} /></Field>
            {(["stage", "exhibitor"] as Role[]).map((r) => (
              <Field key={r} label={`Team ${ROLE_LABEL[r]} (comma-separated)`}><input className="inp" placeholder="e.g. Ton, Bee, Nan" value={teamText[r]} onChange={(e) => setTeamText({ ...teamText, [r]: e.target.value })} /></Field>
            ))}
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Client contact (any of these)</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Contact name"><input className="inp" autoComplete="off" value={editing.contact.name} onChange={(e) => setContact({ name: e.target.value })} /></Field>
                <Field label="Phone"><input type="tel" inputMode="tel" className="inp" placeholder="08x-xxx-xxxx" value={editing.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} /></Field>
                <Field label="LINE ID"><input className="inp" autoCapitalize="off" placeholder="e.g. somchai or @shopname" value={editing.contact.line} onChange={(e) => setContact({ line: e.target.value })} /></Field>
                <Field label="Email"><input type="email" inputMode="email" className="inp" autoCapitalize="off" placeholder="name@company.com" value={editing.contact.email} onChange={(e) => setContact({ email: e.target.value })} /></Field>
              </div>
            </fieldset>
            <Field label="Google link (Maps / Drive / Docs)"><input className="inp" placeholder="https://..." value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
            <div className="flex justify-between pt-2">
              <button onClick={() => { setEvents((p) => p.filter((x) => x.id !== editing.id)); setEditing(null); }} className="flex items-center gap-1 text-sm text-destructive"><Trash2 size={14} />Delete</button>
              <button onClick={save} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
