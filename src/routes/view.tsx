import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/Calendar";
import { type CalEvent, decodeEvents, loadEvents } from "@/lib/events";

export const Route = createFileRoute("/view")({
  head: () => ({
    meta: [
      { title: "ปฏิทิน Event (อ่านอย่างเดียว)" },
      { name: "description", content: "ดูตาราง event สถานที่ และทีมงาน แบบอ่านอย่างเดียว" },
      { property: "og:title", content: "ปฏิทิน Event (อ่านอย่างเดียว)" },
      { property: "og:description", content: "ตาราง event และทีมงานที่ได้รับมอบหมาย" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: View,
});

function View() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  useEffect(() => {
    const h = location.hash.slice(1);
    setEvents(h ? decodeEvents(h) : loadEvents());
  }, []);
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">อ่านอย่างเดียว</p>
        <h1 className="font-display text-5xl text-foreground">ปฏิทิน Event</h1>
      </header>
      <Calendar events={events} readOnly />
    </main>
  );
}
