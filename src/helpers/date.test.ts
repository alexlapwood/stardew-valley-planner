import { formatShortDate, getDay, getSeason, getYear } from "./date";

describe("Date helper", () => {
  it("gets the correct day", () => {
    expect(getDay(0)).toBe(0);
    expect(getDay(27)).toBe(27);
    expect(getDay(28)).toBe(0);
    expect(getDay(55)).toBe(27);
    expect(getDay(56)).toBe(0);
  });

  it("gets the correct season", () => {
    expect(getSeason(0)).toBe(0);
    expect(getSeason(27)).toBe(0);
    expect(getSeason(28)).toBe(1);
    expect(getSeason(55)).toBe(1);
    expect(getSeason(56)).toBe(2);
  });

  it("gets the correct year", () => {
    expect(getYear(0)).toBe(0);
    expect(getYear(111)).toBe(0);
    expect(getYear(112)).toBe(1);
  });

  it("gives a short date, with the year only when it is not the year on view", () => {
    expect(formatShortDate(5)).toBe("Sp 6");
    expect(formatShortDate(30, 0)).toBe("Su 3");
    expect(formatShortDate(56 + 27, 60)).toBe("Fa 28");
    expect(formatShortDate(84, 0)).toBe("Wi 1");
    expect(formatShortDate(112 + 5, 100)).toBe("Sp 6, Y2");
    expect(formatShortDate(5, 112)).toBe("Sp 6, Y1");
  });
});
