import { buildings } from "../data/game/buildings.json";
import {
  clearColorsOn,
  getColorsOn,
  getPaintable,
  getPaintJob,
  isSameColors,
  paintBuildingColors,
  paintColorsOn,
} from "./buildingColors";

const red: TPaintColors = {
  Building: { hue: 0, lightness: -20, saturation: 60 },
};
const blue: TPaintColors = {
  Roof: { hue: 220, lightness: -5, saturation: 50 },
};

const stable: IPlannedBuilding = {
  buildingId: "stable",
  datePlaced: 3,
  x: 10,
  y: 10,
};

const colorPaint = (
  datePainted: number,
  colors: TPaintColors,
): IPlannedColorPaint => ({ colors, datePainted });

describe("getPaintable", () => {
  it.each(["stable", "big_shed", "deluxe_coop", "deluxe_barn"])(
    "paints the %s, which has paint data and a mask",
    (buildingId) => {
      expect(getPaintable({ buildingId, houseLevel: 0 })).toEqual({
        paint: buildings[buildingId].paint,
      });
    },
  );

  it("paints the house only from the Nursery, the level whose look has the mask", () => {
    expect(
      [0, 1, 2, 3].map(
        (houseLevel) =>
          getPaintable({
            buildingId: "farmhouse",
            houseLevel,
            lookKey: houseLevel < 2 ? `upgrade_${houseLevel}` : "upgrade_2",
          }).block,
      ),
    ).toEqual([
      { level: 2, type: "level" },
      { level: 2, type: "level" },
      undefined,
      undefined,
    ]);
  });

  it("does not paint a cabin, which needs a cabin upgrade that the plan does not have", () => {
    expect(getPaintable({ buildingId: "cabin", houseLevel: 0 }).block).toEqual({
      level: 2,
      type: "level",
    });
    expect(
      getPaintable({
        buildingId: "cabin",
        houseLevel: 0,
        lookKey: "log_cabin",
      }).block,
    ).toEqual({ level: 2, type: "level" });
  });

  it("names the higher tier that takes paint, for a building that does not", () => {
    expect(
      ["barn", "big_barn", "coop", "big_coop", "shed"].map(
        (buildingId) => getPaintable({ buildingId, houseLevel: 0 }).block,
      ),
    ).toEqual([
      { type: "none", upgradeId: "deluxe_barn" },
      { type: "none", upgradeId: "deluxe_barn" },
      { type: "none", upgradeId: "deluxe_coop" },
      { type: "none", upgradeId: "deluxe_coop" },
      { type: "none", upgradeId: "big_shed" },
    ]);
  });

  it.each(["silo", "mill", "greenhouse", "pet_bowl", "shipping_bin"])(
    "does not paint the %s, which has no paint data",
    (buildingId) => {
      expect(getPaintable({ buildingId, houseLevel: 0 }).block).toEqual({
        type: "none",
      });
    },
  );
});

describe("getColorsOn", () => {
  it("has the colours of the last colour paint on or before the date", () => {
    const painted = {
      colorPaints: [colorPaint(5, red), colorPaint(9, blue)],
    };

    expect([4, 5, 8, 9, 30].map((date) => getColorsOn(painted, date))).toEqual([
      undefined,
      red,
      red,
      blue,
      blue,
    ]);
  });

  it("has no colours after a change of skin, until the next colour paint, as in the game", () => {
    const painted = {
      colorPaints: [colorPaint(5, red), colorPaint(12, blue)],
      paints: [{ datePainted: 8, skin: "log_cabin" }],
    };

    expect([7, 8, 11, 12].map((date) => getColorsOn(painted, date))).toEqual([
      red,
      undefined,
      undefined,
      blue,
    ]);
  });

  it("keeps a colour paint on the day of a skin change, because it came after the change", () => {
    expect(
      getColorsOn(
        {
          colorPaints: [colorPaint(8, red)],
          paints: [{ datePainted: 8, skin: "log_cabin" }],
        },
        8,
      ),
    ).toEqual(red);
  });

  it("has no colours from a colour paint with no paint", () => {
    expect(
      getColorsOn({ colorPaints: [colorPaint(5, red), colorPaint(7, {})] }, 9),
    ).toBeUndefined();
  });
});

describe("paintColorsOn", () => {
  it("puts the paint in date order, takes the place of a paint on the same day, and keeps the later paints", () => {
    expect(
      paintColorsOn([colorPaint(5, red), colorPaint(9, blue)], 2, {
        Trim: { hue: 1, lightness: 0, saturation: 0 },
      }).map(({ datePainted }) => datePainted),
    ).toEqual([2, 5, 9]);
    expect(
      paintColorsOn([colorPaint(5, red), colorPaint(9, blue)], 5, blue),
    ).toEqual([colorPaint(5, blue)]);
  });

  it("drops a paint that keeps the colours that the building has", () => {
    expect(paintColorsOn([colorPaint(5, red)], 7, red)).toEqual([
      colorPaint(5, red),
    ]);
    expect(paintColorsOn([], 7, {})).toEqual([]);
  });

  it("keeps the same colours after a change of skin, which took them off", () => {
    expect(
      paintColorsOn([colorPaint(5, red)], 9, red, [
        { datePainted: 8, skin: "log_cabin" },
      ]),
    ).toEqual([colorPaint(5, red), colorPaint(9, red)]);
  });
});

describe("paintBuildingColors and clearColorsOn", () => {
  it("adds the colour paint to the building, and a skin change takes off the paint of its day", () => {
    const painted = paintBuildingColors(stable, 6, red);

    expect(painted).toEqual({ ...stable, colorPaints: [colorPaint(6, red)] });
    expect(clearColorsOn(painted, 6)).toEqual(stable);
    expect(clearColorsOn(painted, 7)).toEqual(painted);
  });
});

describe("isSameColors", () => {
  it("compares each region, and a missing region has no paint", () => {
    expect(isSameColors(red, { ...red })).toBe(true);
    expect(isSameColors(undefined, {})).toBe(true);
    expect(isSameColors(red, { ...red, ...blue })).toBe(false);
    expect(
      isSameColors(red, {
        Building: { hue: 0, lightness: -21, saturation: 60 },
      }),
    ).toBe(false);
  });
});

describe("getPaintJob", () => {
  const offset = { x: 0, y: -64 };

  it("paints the regions that have colours, with the mask of the shown look", () => {
    expect(
      getPaintJob(buildings.stable, undefined, { ...red, ...blue }, offset),
    ).toEqual({
      mask: buildings.stable.sprite.paintMask,
      offset,
      regions: [
        { color: red.Building, maskColor: [255, 0, 0] },
        { color: blue.Roof, maskColor: [0, 255, 0] },
      ],
    });
  });

  it("paints the house only with the look of level 2 or more", () => {
    const { farmhouse } = buildings;

    expect(getPaintJob(farmhouse, "upgrade_1", red, offset)).toBeUndefined();
    expect(getPaintJob(farmhouse, "upgrade_2", red, offset)?.mask).toEqual(
      farmhouse.looks?.upgrade_2?.sprite.paintMask,
    );
  });

  it("has no job with no colours, or for a building with no mask", () => {
    expect(
      getPaintJob(buildings.stable, undefined, {}, offset),
    ).toBeUndefined();
    expect(
      getPaintJob(buildings.stable, undefined, undefined, offset),
    ).toBeUndefined();
    expect(
      getPaintJob(buildings.cabin, undefined, red, offset),
    ).toBeUndefined();
    expect(
      getPaintJob(buildings.big_barn, undefined, red, offset),
    ).toBeUndefined();
  });
});
