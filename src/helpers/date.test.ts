import { getDay, getSeason, getYear } from "./date";

describe("Date helper", () => {
  it("gets the correct day", () => {
    expect(getDay(1)).toBe(1);
    expect(getDay(28)).toBe(28);
    expect(getDay(29)).toBe(1);
    expect(getDay(56)).toBe(28);
    expect(getDay(57)).toBe(1);
  });

  it("gets the correct season", () => {
    expect(getSeason(1)).toBe(0);
    expect(getSeason(28)).toBe(0);
    expect(getSeason(29)).toBe(1);
    expect(getSeason(56)).toBe(1);
    expect(getSeason(57)).toBe(2);
  });

  it("gets the correct year", () => {
    expect(getYear(1)).toBe(1);
    expect(getYear(112)).toBe(1);
    expect(getYear(113)).toBe(2);
  });
});
