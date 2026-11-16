import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { type CalEvent, type Role, ROLE_LABEL, encodeEvents, loadEvents, saveEvents } from "@/lib/events";

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
const blank = (date: string): CalEvent => ({ id: crypto.randomUUID(), date, title: "", location: "", details: "", team: [], url: "" });

function Index() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [teamText, setTeamText] = useState<Record<Role, string>>({ stage: "", exhibitor: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => { setEvents(loadEvents()); setReady(true); }, []);
  useEffect(() => { if (ready) saveEvents(events); }, [events, ready]);

  const open = (e: CalEvent) => { setEditing(e); setTeamText({ stage: names(e, "stage"), exhibitor: names(e, "exhibitor") }); };
  const save = () => {
    if (!editing) return;
    const split = (r: Role) => teamText[r].split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name, role: r }));
    const ev = { ...editing, team: [...split("stage"), ...split("exhibitor")] };
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
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Event Planner</p>
          <h1 className="font-display text-5xl text-foreground">ปฏิทิน Event</h1>
        </div>
        <button onClick={share} className="btn-primary"><Share2 size={16} />{copied ? "คัดลอกลิงก์แล้ว!" : "แชร์แบบอ่านอย่างเดียว"}</button>
      </header>
      <Calendar events={events} onAdd={(d) => open(blank(d))} onEdit={open} />
      <p className="mt-6 text-xs text-muted-foreground">ข้อมูลบันทึกไว้ในเบราว์เซอร์นี้ · ลิงก์แชร์เป็นภาพ ณ ตอนที่กดแชร์ (แก้ไขแล้วต้องแชร์ใหม่) · <Link to="/view" className="underline">ดูหน้าอ่านอย่างเดียว</Link></p>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg space-y-3 rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Event</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="วันเริ่ม"><input type="date" className="inp" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="วันสิ้นสุด (ถ้าหลายวัน)"><input type="date" className="inp" min={editing.date} value={editing.endDate || ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></Field>
            </div>
            <Field label="ชื่อ event"><input className="inp" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="สถานที่"><input className="inp" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Field>
            <Field label="รายละเอียด"><textarea rows={3} className="inp" value={editing.details} onChange={(e) => setEditing({ ...editing, details: e.target.value })} /></Field>
            {(["stage", "exhibitor"] as Role[]).map((r) => (
              <Field key={r} label={`ทีม ${ROLE_LABEL[r]} (คั่นด้วย ,)`}><input className="inp" placeholder="เช่น ต้น, บี, แนน" value={teamText[r]} onChange={(e) => setTeamText({ ...teamText, [r]: e.target.value })} /></Field>
            ))}
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
