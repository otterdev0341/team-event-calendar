import { describe, expect, it } from "vitest";

import {
  decodeEvents,
  encodeEvents,
  lineUrl,
  matchesQuery,
  monthSummary,
  shortAmount,
  valueBadge,
  weekSegments,
  normalize,
  teamMessage,
} from "@/lib/events";

const ev = (o: Record<string, unknown>) =>
  normalize({
    id: Math.random().toString(),
    title: "",
    location: "",
    details: "",
    team: [],
    url: "",
    ...o,
  });

describe("event types", () => {
  it("defaults legacy events (no type) to pay", () => {
    expect(ev({ date: "2026-11-01" }).type).toBe("pay");
  });

  it("drops pay-only fields from sponsor events", () => {
    const e = ev({ date: "2026-11-01", type: "sponsor", value: 999, qt: "QT1", bl: "BL1" });
    expect(e.value).toBeUndefined();
    expect(e.qt).toBeUndefined();
    expect(e.bl).toBeUndefined();
  });

  it("keeps value/QT/BL through the share link", () => {
    const [back] = decodeEvents(
      encodeEvents([
        ev({ date: "2026-11-01", type: "pay", value: 1500, qt: "QT-01", bl: "BL-02" }),
      ]),
    );
    expect(back).toMatchObject({ type: "pay", value: 1500, qt: "QT-01", bl: "BL-02" });
  });
});

describe("monthSummary", () => {
  const events = [
    ev({ date: "2026-11-03", type: "pay", value: 10000 }),
    ev({ date: "2026-11-20", endDate: "2026-12-02", type: "pay", value: 2500.5 }),
    ev({ date: "2026-11-10", type: "sponsor" }),
    ev({ date: "2026-11-12", type: "pay" }), // no value yet
    ev({ date: "2026-12-05", type: "pay", value: 7000 }),
  ];

  it("sums pay values for events starting in the month", () => {
    expect(monthSummary(events, 2026, 10)).toEqual({
      total: 12500.5,
      payCount: 3,
      sponsorCount: 1,
      cancelledCount: 0,
    });
  });

  it("counts a cross-month event only in its start month", () => {
    expect(monthSummary(events, 2026, 11)).toEqual({
      total: 7000,
      payCount: 1,
      sponsorCount: 0,
      cancelledCount: 0,
    });
  });
});

describe("contact & team message", () => {
  it("fills an empty contact for old events", () => {
    expect(ev({ date: "2026-11-01" }).contact).toEqual({
      name: "",
      phone: "",
      line: "",
      email: "",
    });
  });

  it("builds a team brief with contact but without money", () => {
    const msg = teamMessage(
      ev({
        date: "2026-11-05",
        title: "Tech Expo",
        location: "BITEC",
        type: "pay",
        value: 45000,
        qt: "QT-1",
        team: [{ name: "ต้น", role: "stage" }],
        contact: { name: "คุณเอ", phone: "081-234-5678", line: "@expo", email: "" },
      }),
    );
    expect(msg).toContain("Tech Expo");
    expect(msg).toContain("BITEC");
    expect(msg).toContain("ต้น");
    expect(msg).toContain("081-234-5678");
    expect(msg).toContain("LINE: @expo");
    expect(msg).not.toContain("45");
    expect(msg).not.toContain("QT");
  });

  it("builds LINE links for personal and official IDs", () => {
    expect(lineUrl("somchai")).toBe("https://line.me/R/ti/p/~somchai");
    expect(lineUrl("@shop")).toBe("https://line.me/R/ti/p/%40shop");
  });
});

describe("customer, status & search", () => {
  it("defaults status to กำลังคุย and customer to empty", () => {
    const e = ev({ date: "2026-11-01" });
    expect(e.status).toBe("talking");
    expect(e.customer).toBe("");
    expect(normalize({ ...e, status: "confirmed" }).status).toBe("confirmed");
  });

  it("searches title, customer, contact, team and status label", () => {
    const e = ev({
      date: "2026-11-01",
      title: "Tech Expo",
      customer: "บริษัท เอบีซี",
      status: "wait_qt",
      team: [{ name: "แนน", role: "exhibitor" }],
      contact: { name: "คุณเอ", phone: "0812345678", line: "", email: "a@abc.co" },
    });
    for (const q of ["tech", "เอบีซี", "คุณเอ", "081234", "ABC.CO", "แนน", "รอ QT", ""])
      expect(matchesQuery(e, q)).toBe(true);
    expect(matchesQuery(e, "ไม่มีคำนี้")).toBe(false);
  });
});

describe("cancelled & QT sent", () => {
  it("keeps the new statuses", () => {
    expect(ev({ date: "2026-11-01", status: "qt_sent" }).status).toBe("qt_sent");
    expect(ev({ date: "2026-11-01", status: "cancelled" }).status).toBe("cancelled");
  });

  it("leaves cancelled events out of the monthly total", () => {
    const events = [
      ev({ date: "2026-11-03", type: "pay", value: 10000 }),
      ev({ date: "2026-11-04", type: "pay", value: 5000, status: "cancelled" }),
      ev({ date: "2026-11-05", type: "sponsor", status: "cancelled" }),
    ];
    expect(monthSummary(events, 2026, 10)).toEqual({
      total: 10000,
      payCount: 1,
      sponsorCount: 0,
      cancelledCount: 2,
    });
  });
});

describe("calendar badges", () => {
  it("shortens amounts", () => {
    expect([950, 12500, 50000, 100000, 1200000].map(shortAmount)).toEqual([
      "950",
      "12.5k",
      "50k",
      "100k",
      "1.2M",
    ]);
  });

  it("shows SPR for sponsor, short value for pay, nothing for pay without value", () => {
    expect(valueBadge(ev({ date: "2026-11-01", type: "sponsor" }))).toBe("SPR");
    expect(valueBadge(ev({ date: "2026-11-01", type: "pay", value: 50000 }))).toBe("50k");
    expect(valueBadge(ev({ date: "2026-11-01", type: "pay" }))).toBeNull();
  });
});

describe("weekSegments", () => {
  // Week of Mon 9 – Sun 15 Nov 2026
  const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 9 + i));
  const all = days.map(() => true);

  it("spans a multi-day event across its columns and skips single days", () => {
    const { segs, lanes } = weekSegments(
      [ev({ date: "2026-11-12", endDate: "2026-11-13" }), ev({ date: "2026-11-10" })],
      days,
      all,
    );
    expect(lanes).toBe(1);
    expect(segs[0]).toMatchObject({ start: 3, end: 4, lane: 0, contLeft: false, contRight: false });
  });

  it("marks events that continue into the next / previous week", () => {
    const { segs } = weekSegments([ev({ date: "2026-11-07", endDate: "2026-11-17" })], days, all);
    expect(segs[0]).toMatchObject({ start: 0, end: 6, contLeft: true, contRight: true });
  });

  it("stacks overlapping events in separate lanes", () => {
    const { segs, lanes } = weekSegments(
      [
        ev({ date: "2026-11-09", endDate: "2026-11-11" }),
        ev({ date: "2026-11-10", endDate: "2026-11-12" }),
        ev({ date: "2026-11-13", endDate: "2026-11-14" }),
      ],
      days,
      all,
    );
    expect(lanes).toBe(2);
    expect(segs.map((s) => s.lane)).toEqual([0, 1, 0]);
  });
});
