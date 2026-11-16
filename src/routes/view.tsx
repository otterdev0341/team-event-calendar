import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/Calendar";
import { type CalEvent, decodeEvents, loadEvents } from "@/lib/events";

export const Route = createFileRoute("/view")({
  head: () => ({
    meta: [
      { title: "Event Calendar (read-only)" },
      { name: "description", content: "Read-only view of events, venues and team" },
      { property: "og:title", content: "Event Calendar (read-only)" },
      { property: "og:description", content: "Events and assigned team" },
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
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:py-10">
      <header className="mb-6 sm:mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Read-only</p>
        <h1 className="font-display text-3xl text-foreground sm:text-5xl">Event Calendar</h1>
      </header>
      <Calendar events={events} readOnly />
    </main>
  );
}
