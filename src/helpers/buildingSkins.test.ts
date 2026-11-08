import { buildings } from "../data/game/buildings.json";
import {
  getLookKeyOn,
  getSkinKeys,
  getSkinName,
  getSkinOn,
  hasSkins,
  isGoodPaint,
  keepPaintsBefore,
  paintBuilding,
  paintOn,
  stepSkin,
  withSkin,
} from "./buildingSkins";

function cabin(overrides: Partial<IPlannedBuilding> = {}): IPlannedBuilding {
  return { buildingId: "cabin", datePlaced: 5, x: 40, y: 30, ...overrides };
}

describe("getSkinKeys", () => {
  it("lists the look with no skin first, as the building id, and then the skins of the export", () => {
    expect(getSkinKeys("cabin")).toEqual([
      "cabin",
      ...Object.keys(buildings.cabin.skins ?? {}),
    ]);
    expect(getSkinKeys("pet_bowl")).toEqual([
      "pet_bowl",
      "hay_pet_bowl",
      "stone_pet_bowl",
    ]);
  });

  it("has no skins for a building that has no skins in the export, or that the export does not have", () => {
    expect(getSkinKeys("barn")).toEqual([]);
    expect(getSkinKeys("castle")).toEqual([]);
    expect(hasSkins("barn")).toBe(false);
    expect(hasSkins("cabin")).toBe(true);
  });
});

describe("getSkinName", () => {
  it("names a skin from the export, and the look with no skin with the building name", () => {
    expect(getSkinName("cabin", "log_cabin")).toBe("Log Cabin");
    expect(getSkinName("cabin", "cabin")).toBe("Cabin");
    expect(getSkinName("pet_bowl", "stone_pet_bowl")).toBe("Stone Pet Bowl");
  });
});

describe("stepSkin", () => {
  it("goes to the next and the previous skin, round the list, like the game's arrows", () => {
    expect(stepSkin("pet_bowl", "pet_bowl", 1)).toBe("hay_pet_bowl");
    expect(stepSkin("pet_bowl", "stone_pet_bowl", 1)).toBe("pet_bowl");
    expect(stepSkin("pet_bowl", "pet_bowl", -1)).toBe("stone_pet_bowl");
    expect(stepSkin("pet_bowl", "hay_pet_bowl", -1)).toBe("pet_bowl");
  });
});

describe("withSkin", () => {
  it("keeps a skin of the building, and no skin for the look with no skin or a skin it does not have", () => {
    expect(withSkin(cabin(), "log_cabin")).toEqual(
      cabin({ skin: "log_cabin" }),
    );
    expect(withSkin(cabin({ skin: "log_cabin" }), "cabin")).toStrictEqual(
      cabin(),
    );
    expect(withSkin(cabin(), "hay_pet_bowl")).toStrictEqual(cabin());
    expect(withSkin(cabin(), undefined)).toStrictEqual(cabin());
  });
});

describe("getSkinOn", () => {
  const painted = cabin({
    paints: [
      { datePainted: 10, skin: "plank_cabin" },
      { datePainted: 20, skin: "cabin" },
    ],
    skin: "log_cabin",
  });

  it.each([
    [5, "log_cabin"],
    [9, "log_cabin"],
    [10, "plank_cabin"],
    [19, "plank_cabin"],
    [20, "cabin"],
    [80, "cabin"],
  ])("has the look that is active on day %i", (date, skin) => {
    expect(getSkinOn(painted, date)).toBe(skin);
  });

  it("gives no look key for the look with no skin, so the building draws its own sprite", () => {
    expect(getLookKeyOn(painted, 10)).toBe("plank_cabin");
    expect(getLookKeyOn(painted, 20)).toBeUndefined();
    expect(getLookKeyOn(cabin(), 5)).toBeUndefined();
  });
});

describe("paintOn", () => {
  const paints: IPlannedPaint[] = [
    { datePainted: 10, skin: "plank_cabin" },
    { datePainted: 20, skin: "log_cabin" },
  ];

  it("adds the paint in date order, and keeps the later paints", () => {
    expect(paintOn(paints, "cabin", 15, "beach_cabin")).toEqual([
      { datePainted: 10, skin: "plank_cabin" },
      { datePainted: 15, skin: "beach_cabin" },
      { datePainted: 20, skin: "log_cabin" },
    ]);
  });

  it("takes the place of a paint on the same day", () => {
    expect(paintOn(paints, "cabin", 10, "trailer_cabin")).toEqual([
      { datePainted: 10, skin: "trailer_cabin" },
      { datePainted: 20, skin: "log_cabin" },
    ]);
  });

  it("drops the paints that keep the look the building has", () => {
    expect(paintOn(paints, "cabin", 15, "log_cabin")).toEqual([
      { datePainted: 10, skin: "plank_cabin" },
      { datePainted: 15, skin: "log_cabin" },
    ]);
    expect(paintOn(paints, "cabin", 10, "cabin")).toEqual([
      { datePainted: 20, skin: "log_cabin" },
    ]);
  });
});

describe("paintBuilding", () => {
  it("adds a dated paint after the order day", () => {
    expect(paintBuilding(cabin(), 12, "log_cabin")).toEqual(
      cabin({ paints: [{ datePainted: 12, skin: "log_cabin" }] }),
    );
  });

  it("changes the skin of the order on the order day, and drops a later paint that it makes the same", () => {
    const painted = cabin({ paints: [{ datePainted: 12, skin: "log_cabin" }] });

    expect(paintBuilding(painted, 5, "rustic_cabin")).toEqual(
      cabin({
        paints: [{ datePainted: 12, skin: "log_cabin" }],
        skin: "rustic_cabin",
      }),
    );
    expect(paintBuilding(painted, 5, "log_cabin")).toStrictEqual(
      cabin({ skin: "log_cabin" }),
    );
  });

  it("takes the paints away when they all go back to the look of the order", () => {
    const painted = cabin({ paints: [{ datePainted: 12, skin: "log_cabin" }] });

    expect(paintBuilding(painted, 12, "cabin")).toStrictEqual(cabin());
  });
});

describe("keepPaintsBefore", () => {
  it("keeps only the paints before the date", () => {
    const painted = cabin({
      paints: [
        { datePainted: 10, skin: "plank_cabin" },
        { datePainted: 20, skin: "log_cabin" },
      ],
    });

    expect(keepPaintsBefore(painted, 20)).toEqual(
      cabin({ paints: [{ datePainted: 10, skin: "plank_cabin" }] }),
    );
    expect(keepPaintsBefore(painted, 10)).toStrictEqual(cabin());
  });

  it("keeps only the colour paints before the date", () => {
    const colors: TPaintColors = {
      Roof: { hue: 10, lightness: 0, saturation: 30 },
    };
    const painted = cabin({
      colorPaints: [
        { colors, datePainted: 10 },
        { colors: {}, datePainted: 20 },
      ],
    });

    expect(keepPaintsBefore(painted, 20)).toEqual(
      cabin({ colorPaints: [{ colors, datePainted: 10 }] }),
    );
    expect(keepPaintsBefore(painted, 10)).toStrictEqual(cabin());
  });
});

describe("isGoodPaint", () => {
  it.each([
    ["a skin of the building on a later day", 6, "log_cabin", undefined, true],
    ["the look with no skin", 6, "cabin", undefined, true],
    ["a skin of another building", 6, "hay_pet_bowl", undefined, false],
    ["a day too soon", 4, "log_cabin", undefined, false],
    ["a day that is not whole", 6.5, "log_cabin", undefined, false],
    ["the demolish day", 9, "log_cabin", 9, false],
    ["the day before the demolish", 8, "log_cabin", 9, true],
  ])("checks %s", (_, datePainted, skin, dateDestroyed, isGood) => {
    expect(isGoodPaint({ datePainted, skin }, "cabin", 5, dateDestroyed)).toBe(
      isGood,
    );
  });
});
