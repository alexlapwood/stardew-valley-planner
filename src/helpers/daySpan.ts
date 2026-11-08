// No lastDay: the thing stays.
export interface IDaySpan {
  firstDay: number;
  lastDay?: number;
}

export function isOnDay({ firstDay, lastDay }: IDaySpan, date: number) {
  return date >= firstDay && (lastDay === undefined || date <= lastDay);
}

// A thing destroyed on the day it was put down has a last day before its first
// day, so it shares no day with anything.
export function isOverlapping(a: IDaySpan, b: IDaySpan) {
  const firstDay = Math.max(a.firstDay, b.firstDay);

  return (
    (a.lastDay === undefined || a.lastDay >= firstDay) &&
    (b.lastDay === undefined || b.lastDay >= firstDay)
  );
}
