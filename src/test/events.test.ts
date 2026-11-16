import { describe, expect, it } from "vitest";

import {
  decodeEvents,
  encodeEvents,
  lineUrl,
  matchesQuery,
  monthSummary,
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
    });
  });

  it("counts a cross-month event only in its start month", () => {
    expect(monthSummary(events, 2026, 11)).toEqual({ total: 7000, payCount: 1, sponsorCount: 0 });
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
