import { getCropsLastDay } from "./crop";

describe("Crop helper", () => {
  it("gets the last day a crop will survive", () => {
    const crop = {
      buy: 0,
      harvest: {},
      id: "test_crop",
      index: 481,
      name: "Test Crop",
      seasons: ["spring", "summer"],
      sell: 0,
      stages: [1, 3, 2, 5]
    };

    expect(getCropsLastDay(crop, 1)).toBe(12);
    expect(getCropsLastDay(crop, 28)).toBe(39);
    expect(getCropsLastDay(crop, 29)).toBe(40);
    expect(getCropsLastDay(crop, 56)).toBe(56);
  });

  it("gets the last day a crop that regrows will survive", () => {
    const crop = {
      buy: 0,
      harvest: {},
      id: "test_crop",
      index: 481,
      name: "Test Crop",
      regrow: 1,
      seasons: ["spring", "summer"],
      sell: 0,
      stages: [1]
    };

    expect(getCropsLastDay(crop, 1)).toBe(56);
    expect(getCropsLastDay(crop, 28)).toBe(56);
    expect(getCropsLastDay(crop, 29)).toBe(56);
    expect(getCropsLastDay(crop, 56)).toBe(56);
  });
});
