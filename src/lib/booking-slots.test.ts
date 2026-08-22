import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "./booking-slots";

describe("generateAvailableSlots", () => {
  const monday9to12 = { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 12 * 60 };

  it("splits a window into fixed-duration slots", () => {
    const from = new Date("2026-08-24T00:00:00Z"); // a Monday
    const to = new Date("2026-08-25T00:00:00Z");
    const slots = generateAvailableSlots({
      rules: [monday9to12],
      booked: [],
      durationMinutes: 60,
      from,
      to,
      now: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-08-24T09:00:00.000Z",
      "2026-08-24T10:00:00.000Z",
      "2026-08-24T11:00:00.000Z",
    ]);
  });

  it("excludes slots that overlap an existing booking", () => {
    const from = new Date("2026-08-24T00:00:00Z");
    const to = new Date("2026-08-25T00:00:00Z");
    const slots = generateAvailableSlots({
      rules: [monday9to12],
      booked: [
        { startsAt: new Date("2026-08-24T10:00:00Z"), endsAt: new Date("2026-08-24T11:00:00Z") },
      ],
      durationMinutes: 60,
      from,
      to,
      now: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-08-24T09:00:00.000Z",
      "2026-08-24T11:00:00.000Z",
    ]);
  });

  it("excludes slots that start in the past", () => {
    const from = new Date("2026-08-24T00:00:00Z");
    const to = new Date("2026-08-25T00:00:00Z");
    const slots = generateAvailableSlots({
      rules: [monday9to12],
      booked: [],
      durationMinutes: 60,
      from,
      to,
      now: new Date("2026-08-24T10:30:00Z"),
    });
    expect(slots.map((s) => s.toISOString())).toEqual(["2026-08-24T11:00:00.000Z"]);
  });

  it("returns nothing when the day has no matching rule", () => {
    const from = new Date("2026-08-25T00:00:00Z"); // Tuesday
    const to = new Date("2026-08-26T00:00:00Z");
    const slots = generateAvailableSlots({
      rules: [monday9to12],
      booked: [],
      durationMinutes: 60,
      from,
      to,
    });
    expect(slots).toEqual([]);
  });

  it("does not overflow a rule window with a duration that doesn't evenly divide it", () => {
    const from = new Date("2026-08-24T00:00:00Z");
    const to = new Date("2026-08-25T00:00:00Z");
    const slots = generateAvailableSlots({
      rules: [monday9to12],
      booked: [],
      durationMinutes: 50,
      from,
      to,
      now: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-08-24T09:00:00.000Z",
      "2026-08-24T09:50:00.000Z",
      "2026-08-24T10:40:00.000Z",
    ]);
  });
});
