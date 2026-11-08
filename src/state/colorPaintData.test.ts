import { readFarmData, toSavedFarmData } from "./farmData";

const roof = { hue: 200, lightness: -12, saturation: 50 };

const housePaint = { colors: { Roof: roof }, datePainted: 9 };

const noPaint = { colors: {}, datePainted: 20 };

const stable = {
  buildingId: "stable",
  datePlaced: 4,
  x: 10,
  y: 12,
};

function farmFile(fields: Record<string, unknown> = {}) {
  return {
    buildings: [],
    crops: {},
    cutBushes: [],
    date: 0,
    equipment: {},
    farm: "beach",
    houseUpgrades: [],
    petBowlPaints: [],
    version: 4,
    ...fields,
  };
}

function readSaved(file: unknown): unknown {
  const result = readFarmData(file);

  if (result === undefined) {
    throw new Error("The farm file is not valid");
  }

  return JSON.parse(toSavedFarmData(result.data));
}

describe("house colour paints", () => {
  it("keeps the colour paints of the house in date order, and saves them", () => {
    const file = farmFile({ houseColorPaints: [housePaint, noPaint] });
    const result = readFarmData(file);

    expect(result?.data.houseColorPaints).toEqual([housePaint, noPaint]);
    expect(result?.badItems).toEqual([]);
    expect(readSaved(file)).toHaveProperty("houseColorPaints", [
      housePaint,
      noPaint,
    ]);
  });

  it("has no house paints, and saves none, when the file has none", () => {
    const result = readFarmData(farmFile());

    expect(result?.data).not.toHaveProperty("houseColorPaints");
    expect(result?.badItems).toEqual([]);
    expect(readSaved(farmFile())).not.toHaveProperty("houseColorPaints");
  });

  it.each([
    ["a region that the game does not have", { Chimney: roof }],
    ["a hue past 360", { Roof: { ...roof, hue: 361 } }],
    ["a saturation past 75", { Roof: { ...roof, saturation: 80 } }],
    ["a lightness past -100", { Roof: { ...roof, lightness: -101 } }],
    ["a value that is not whole", { Roof: { ...roof, hue: 1.5 } }],
    ["a colour that is not a record", { Roof: "red" }],
    ["colours that are not a record", [roof]],
  ])("drops a paint with %s, and reports it", (_, colors) => {
    const bad = { colors, datePainted: 12 };
    const result = readFarmData(
      farmFile({ houseColorPaints: [housePaint, bad, noPaint] }),
    );

    expect(result?.data.houseColorPaints).toEqual([housePaint, noPaint]);
    expect(result?.badItems).toEqual([
      { path: "houseColorPaints[1]", value: bad },
    ]);
  });

  it("drops a paint that is not after the paint before it, and paints that are not a list", () => {
    const sameDay = { ...noPaint, datePainted: 9 };

    expect(
      readFarmData(farmFile({ houseColorPaints: [housePaint, sameDay] }))
        ?.badItems,
    ).toEqual([{ path: "houseColorPaints[1]", value: sameDay }]);
    expect(
      readFarmData(farmFile({ houseColorPaints: housePaint }))?.badItems,
    ).toEqual([{ path: "houseColorPaints", value: housePaint }]);
  });
});

describe("building colour paints", () => {
  it("keeps the colour paints of a building from its order day", () => {
    const colorPaints = [{ ...housePaint, datePainted: 4 }, noPaint];
    const result = readFarmData(
      farmFile({ buildings: [{ ...stable, colorPaints }] }),
    );

    expect(result?.data.buildings).toEqual([{ ...stable, colorPaints }]);
    expect(result?.badItems).toEqual([]);
  });

  it("drops a colour paint before the order day or from the demolish day", () => {
    const early = { ...housePaint, datePainted: 3 };
    const late = { ...housePaint, datePainted: 30 };
    const result = readFarmData(
      farmFile({
        buildings: [
          {
            ...stable,
            colorPaints: [early, housePaint, late],
            dateDestroyed: 30,
          },
        ],
      }),
    );

    expect(result?.data.buildings).toEqual([
      { ...stable, colorPaints: [housePaint], dateDestroyed: 30 },
    ]);
    expect(result?.badItems).toEqual([
      { path: "buildings[0].colorPaints[0]", value: early },
      { path: "buildings[0].colorPaints[2]", value: late },
    ]);
  });
});
