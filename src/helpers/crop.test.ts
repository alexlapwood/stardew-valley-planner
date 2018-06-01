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

    expect(getCropsLastDay(crop, 0)).toBe(11);
    expect(getCropsLastDay(crop, 27)).toBe(38);
    expect(getCropsLastDay(crop, 28)).toBe(39);
    expect(getCropsLastDay(crop, 55)).toBe(55);
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

    expect(getCropsLastDay(crop, 0)).toBe(55);
    expect(getCropsLastDay(crop, 27)).toBe(55);
    expect(getCropsLastDay(crop, 28)).toBe(55);
    expect(getCropsLastDay(crop, 55)).toBe(55);
  });
});
