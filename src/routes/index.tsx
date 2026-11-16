import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { type CalEvent, type Contact, type EventType, type Role, type Status, ROLE_LABEL, STATUSES, STATUS_LABEL, TYPE_LABEL, emptyContact, encodeEvents, isRealName, loadEvents, saveEvents } from "@/lib/events";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ปฏิทิน Event — จัดทีมงานและสถานที่" },
      { name: "description", content: "ปฏิทิน event ระบุสถานที่ รายละเอียด ทีมงาน และแชร์แบบอ่านอย่างเดียว" },
      { property: "og:title", content: "ปฏิทิน Event" },
      { property: "og:description", content: "วางแผน event ทีมงาน และแชร์ปฏิทินแบบอ่านอย่างเดียว" },
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
    const ev: CalEvent = { ...editing, team: [...split("stage"), ...split("exhibitor")] };
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
          <h1 className="font-display text-3xl text-foreground sm:text-5xl">ปฏิทิน Event</h1>
        </div>
        <button onClick={share} className="btn-primary"><Share2 size={16} />{copied ? "คัดลอกลิงก์แล้ว!" : "แชร์แบบอ่านอย่างเดียว"}</button>
      </header>
      <Calendar events={events} onAdd={(d) => open(blank(d))} onEdit={open} />
      <p className="mt-6 text-xs text-muted-foreground">ข้อมูลบันทึกไว้ในเบราว์เซอร์นี้ · ลิงก์แชร์เป็นภาพ ณ ตอนที่กดแชร์ (แก้ไขแล้วต้องแชร์ใหม่) · <Link to="/view" className="underline">ดูหน้าอ่านอย่างเดียว</Link></p>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Event</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="วันเริ่ม"><input type="date" className="inp" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="วันสิ้นสุด (ถ้าหลายวัน)"><input type="date" className="inp" min={editing.date} value={editing.endDate || ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></Field>
            </div>
            <Field label="ชื่องาน"><input className="inp" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="ลูกค้า / บริษัท"><input className="inp" placeholder="เช่น บริษัท เอบีซี จำกัด" value={editing.customer} onChange={(e) => setEditing({ ...editing, customer: e.target.value })} /></Field>
              <Field label="สถานะ">
                <select className="inp" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Status })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="ประเภท">
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
                <Field label="Value (บาท)">
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
                <Field label="QT"><input className="inp" placeholder="เลขใบเสนอราคา" value={editing.qt || ""} onChange={(e) => setEditing({ ...editing, qt: e.target.value })} /></Field>
                <Field label="BL"><input className="inp" placeholder="เลข BL" value={editing.bl || ""} onChange={(e) => setEditing({ ...editing, bl: e.target.value })} /></Field>
              </div>
            )}
            <Field label="สถานที่"><input className="inp" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Field>
            <Field label="รายละเอียด"><textarea rows={3} className="inp" value={editing.details} onChange={(e) => setEditing({ ...editing, details: e.target.value })} /></Field>
            {(["stage", "exhibitor"] as Role[]).map((r) => (
              <Field key={r} label={`ทีม ${ROLE_LABEL[r]} (คั่นด้วย ,)`}><input className="inp" placeholder="เช่น ต้น, บี, แนน" value={teamText[r]} onChange={(e) => setTeamText({ ...teamText, [r]: e.target.value })} /></Field>
            ))}
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">ติดต่อลูกค้า (ใส่อย่างใดอย่างหนึ่งก็ได้)</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="ชื่อผู้ติดต่อ"><input className="inp" autoComplete="off" value={editing.contact.name} onChange={(e) => setContact({ name: e.target.value })} /></Field>
                <Field label="เบอร์โทร"><input type="tel" inputMode="tel" className="inp" placeholder="08x-xxx-xxxx" value={editing.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} /></Field>
                <Field label="LINE ID"><input className="inp" autoCapitalize="off" placeholder="เช่น somchai หรือ @shopname" value={editing.contact.line} onChange={(e) => setContact({ line: e.target.value })} /></Field>
                <Field label="Email"><input type="email" inputMode="email" className="inp" autoCapitalize="off" placeholder="name@company.com" value={editing.contact.email} onChange={(e) => setContact({ email: e.target.value })} /></Field>
              </div>
            </fieldset>
            <Field label="ลิงก์ Google (Maps / Drive / Docs)"><input className="inp" placeholder="https://..." value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
            <div className="flex justify-between pt-2">
              <button onClick={() => { setEvents((p) => p.filter((x) => x.id !== editing.id)); setEditing(null); }} className="flex items-center gap-1 text-sm text-destructive"><Trash2 size={14} />ลบ</button>
              <button onClick={save} className="btn-primary">บันทึก</button>
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
