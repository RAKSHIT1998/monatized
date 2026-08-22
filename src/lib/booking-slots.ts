// Pure slot-math for Bookings — no db/server-only imports so it's unit-testable.
// All times are UTC minutes-from-midnight in, UTC Dates out. See README for the
// documented single-timezone limitation.

export type AvailabilityRule = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startMinute: number;
  endMinute: number;
};

export type BookedRange = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Generates every open slot of `durationMinutes` between `from` and `to` that
 * falls inside one of `rules`, excluding any slot that overlaps a booking in
 * `booked` or starts before `now`.
 */
export function generateAvailableSlots(params: {
  rules: AvailabilityRule[];
  booked: BookedRange[];
  durationMinutes: number;
  from: Date;
  to: Date;
  now?: Date;
}): Date[] {
  const { rules, booked, durationMinutes, from, to } = params;
  const now = params.now ?? new Date();
  if (durationMinutes <= 0 || rules.length === 0) return [];

  const rulesByDay = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = rulesByDay.get(rule.dayOfWeek) ?? [];
    list.push(rule);
    rulesByDay.set(rule.dayOfWeek, list);
  }

  const slots: Date[] = [];
  const dayStart = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  );

  for (
    let day = new Date(dayStart);
    day.getTime() < to.getTime();
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const dayRules = rulesByDay.get(day.getUTCDay());
    if (!dayRules) continue;

    for (const rule of dayRules) {
      for (
        let minute = rule.startMinute;
        minute + durationMinutes <= rule.endMinute;
        minute += durationMinutes
      ) {
        const startsAt = new Date(day.getTime() + minute * 60_000);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

        if (startsAt.getTime() < now.getTime()) continue;
        if (startsAt.getTime() < from.getTime() || startsAt.getTime() >= to.getTime()) continue;

        const overlaps = booked.some(
          (b) => startsAt.getTime() < b.endsAt.getTime() && endsAt.getTime() > b.startsAt.getTime()
        );
        if (overlaps) continue;

        slots.push(startsAt);
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
