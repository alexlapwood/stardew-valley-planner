import {
  makeTestFarmMapFile,
  testFarmMap,
  testRuleFlags,
} from "../__mocks__/testFarmMap";
import { getScarecrowMap, getSoilMap } from "./farm";
import { decodeFarmMap } from "./farmMap";
import { canInstallAt, canPlantAt, canWalkAt } from "./placementRules";

type TKind = "crop" | "fence" | "floor" | "scarecrow" | "sprinkler";

const equipmentByKind: Record<
  Exclude<TKind, "crop">,
  Pick<IInstalledEquipment, "equipmentId" | "skin">
> = {
  fence: { equipmentId: "fence", skin: "wood_fence" },
  floor: { equipmentId: "flooring", skin: "wood_floor" },
  scarecrow: { equipmentId: "scarecrow", skin: "scarecrow" },
  sprinkler: { equipmentId: "sprinkler", skin: "quality_sprinkler" },
};

function canPut(map: IFarmMap, kind: TKind, x: number, y: number) {
  return kind === "crop"
    ? canPlantAt(map, x, y)
    : canInstallAt(map, equipmentByKind[kind], x, y);
}

function mapWithRow(row: string) {
  const file = makeTestFarmMapFile(row.length, 1);
  file.farm.rules = { flags: testRuleFlags, rows: [row] };

  return decodeFarmMap("row", file);
}

const kinds: TKind[] = ["crop", "fence", "floor", "scarecrow", "sprinkler"];

const allowedOn = (map: IFarmMap, x: number, y: number) =>
  kinds.filter((kind) => canPut(map, kind, x, y));

describe("placement rules from the export flags", () => {
  // 0: no flags, z: tillable + buildable + floorable,
  // N: tillable + blocked + floorable (a NoFurniture tile), g: blocked,
  // w: floorable, 1: tillable, F: tillable + noSprinklers + floorable
  const map = mapWithRow("0zNgw1F");

  it.each([
    ["no flags", 0, ["fence", "scarecrow", "sprinkler"]],
    ["tillable, buildable and floorable", 1, kinds],
    ["tillable, blocked and floorable", 2, ["crop", "floor"]],
    ["blocked", 3, []],
    ["floorable", 4, ["fence", "floor", "scarecrow", "sprinkler"]],
    ["tillable", 5, ["fence", "scarecrow", "sprinkler"]],
    [
      "tillable, noSprinklers and floorable",
      6,
      ["crop", "fence", "floor", "scarecrow"],
    ],
  ] as const)("on a tile with %s, allows %j", (_, x, allowed) => {
    expect(allowedOn(map, x, 0)).toEqual(allowed);
  });

  it.each(kinds)("does not allow a %s off the map", (kind) => {
    expect(
      [
        [-1, 0],
        [7, 0],
        [0, 1],
      ].some(([x, y]) => canPut(map, kind, x, y)),
    ).toBe(false);
  });

  it.each(kinds)(
    "allows a %s on the far tiles of a farm that is bigger than 80 by 65, and not past them",
    (kind) => {
      const bigMap = decodeFarmMap("big", makeTestFarmMapFile(110, 110));

      expect(
        [
          [109, 109],
          [100, 75],
          [110, 0],
          [0, 110],
        ].map(([x, y]) => canPut(bigMap, kind, x, y)),
      ).toEqual([true, true, false, false]);
    },
  );
});

describe("placement on the default buildings", () => {
  it.each([
    ["the greenhouse top-left", 25, 10],
    ["the greenhouse bottom-right", 31, 15],
    ["the farmhouse wall", 59, 12],
    ["the farmhouse steps", 64, 16],
    ["the mailbox", 68, 16],
    ["the pet bowl", 53, 7],
    ["the shipping bin", 72, 14],
  ])("allows only floors on %s", (_, x, y) => {
    expect(allowedOn(testFarmMap, x, y)).toEqual(["floor"]);
  });

  it.each([
    ["beside the greenhouse", 24, 10],
    ["on the greenhouse path", 28, 17],
    ["on the farmhouse porch", 60, 15],
  ])("allows all but crops %s", (_, x, y) => {
    expect(allowedOn(testFarmMap, x, y)).toEqual([
      "fence",
      "floor",
      "scarecrow",
      "sprinkler",
    ]);
  });

  it("allows only crops and floors in front of the farmhouse door", () => {
    expect(allowedOn(testFarmMap, 64, 17)).toEqual(["crop", "floor"]);
  });

  it.each([
    ["beside the greenhouse rules", 22, 10],
    ["below the greenhouse rules", 25, 18],
    ["beside the farmhouse", 57, 14],
    ["beside the shipping bin", 73, 14],
  ])("allows everything %s", (_, x, y) => {
    expect(allowedOn(testFarmMap, x, y)).toEqual(kinds);
  });

  it("allows a sprinkler where a building hides the noSprinklers of the map", () => {
    const file = makeTestFarmMapFile();
    const porchRow = file.farm.rules.rows[15];
    file.farm.rules.rows[15] = `${porchRow.slice(0, 60)}F${porchRow.slice(61)}`;
    const map = decodeFarmMap("porch", file);

    expect(canPut(map, "sprinkler", 60, 15)).toBe(true);
  });
});

describe("ranges", () => {
  it("protects only the tiles in range where a crop can go", () => {
    const map = mapWithRow("zNgw1F0");
    const scarecrowMap = getScarecrowMap(
      {
        0: {
          0: [
            {
              dateInstalled: 0,
              equipmentId: "scarecrow",
              skin: "scarecrow",
              type: "equipment",
              x: 0,
              y: 0,
            },
          ],
        },
      },
      0,
      map,
    );

    expect(
      [...scarecrowMap.keys()].filter((x) => scarecrowMap[x]?.[0] === 0),
    ).toEqual([0, 1, 5]);
  });

  it("waters only the tiles in range where a crop can go and sprinklers work", () => {
    const map = mapWithRow("zFzNg");
    const soilMap = getSoilMap(
      {
        0: {
          2: [
            {
              dateInstalled: 0,
              equipmentId: "sprinkler",
              skin: "iridium_sprinkler",
              type: "equipment",
              x: 2,
              y: 0,
            },
          ],
        },
      },
      0,
      map,
    );

    expect([...soilMap.keys()].filter((x) => soilMap[x]?.[0] === 0)).toEqual([
      0, 3,
    ]);
  });

  it("waters and protects no tile under a planned building while it is there", () => {
    const sprinkler: IInstalledEquipment = {
      dateInstalled: 0,
      equipmentId: "sprinkler",
      skin: "sprinkler",
      type: "equipment",
      x: 10,
      y: 10,
    };
    const scarecrow: IInstalledEquipment = {
      ...sprinkler,
      equipmentId: "scarecrow",
      skin: "scarecrow",
    };
    const shippingBin: IPlannedBuilding = {
      buildingId: "shipping_bin",
      dateDestroyed: 9,
      datePlaced: 5,
      x: 11,
      y: 10,
    };
    const wateredOn = (date: number) => {
      const soilMap = getSoilMap(
        { 10: { 10: [sprinkler] } },
        date,
        testFarmMap,
        [shippingBin],
      );

      return soilMap[11]?.[10];
    };
    const protectedOn = (date: number) =>
      getScarecrowMap({ 10: { 10: [scarecrow] } }, date, testFarmMap, [
        shippingBin,
      ])[11]?.[10];

    expect([4, 5, 9].map(wateredOn)).toEqual([0, undefined, 0]);
    expect([4, 5, 9].map(protectedOn)).toEqual([0, undefined, 0]);
  });
});

describe("placement on planned buildings", () => {
  const barn: IPlannedBuilding = {
    buildingId: "barn",
    dateDestroyed: 30,
    datePlaced: 10,
    x: 10,
    y: 30,
  };
  const days = (firstDay: number, lastDay?: number) => ({
    buildings: [barn],
    firstDay,
    lastDay,
  });

  it("allows only floors on a footprint tile while the building is there", () => {
    expect(
      kinds.filter((kind) =>
        kind === "crop"
          ? canPlantAt(testFarmMap, 12, 31, days(10, 10))
          : canInstallAt(
              testFarmMap,
              equipmentByKind[kind],
              12,
              31,
              days(10, 10),
            ),
      ),
    ).toEqual(["floor"]);
  });

  it("allows a thing whose days end before the building comes, or start after it goes", () => {
    expect(canPlantAt(testFarmMap, 12, 31, days(0, 9))).toBe(true);
    expect(canPlantAt(testFarmMap, 12, 31, days(0, 10))).toBe(false);
    expect(
      canInstallAt(testFarmMap, equipmentByKind.scarecrow, 12, 31, days(0)),
    ).toBe(false);
    expect(
      canInstallAt(testFarmMap, equipmentByKind.scarecrow, 12, 31, days(30)),
    ).toBe(true);
  });

  it("does not allow a floor under a planned Well", () => {
    const well: IPlannedBuilding = {
      buildingId: "well",
      datePlaced: 10,
      x: 10,
      y: 30,
    };

    expect(
      canInstallAt(testFarmMap, equipmentByKind.floor, 11, 31, {
        buildings: [well],
        firstDay: 0,
      }),
    ).toBe(false);
  });
});

describe("canWalkAt", () => {
  const noBuildings = { buildings: [], firstDay: 0 };

  it.each([
    ["no flags", 0, false],
    ["tillable, buildable and floorable", 1, true],
    ["tillable, blocked and floorable (a NoFurniture tile)", 2, true],
    ["blocked", 3, false],
    ["floorable", 4, true],
    ["tillable", 5, false],
  ] as const)("on a tile with %s, is %j", (_, x, isWalkable) => {
    expect(canWalkAt(mapWithRow("0zNgw1F"), x, 0, noBuildings)).toBe(
      isWalkable,
    );
  });

  it("is false off the map", () => {
    expect(canWalkAt(testFarmMap, -1, 0, noBuildings)).toBe(false);
  });

  it("is false on the solid tiles of a fixed building, but not on its open tiles", () => {
    const { farmhouse } = testFarmMap.spots;

    expect(
      [farmhouse.y, farmhouse.y + 3].map((y) =>
        canWalkAt(testFarmMap, farmhouse.x + 1, y, noBuildings),
      ),
    ).toEqual([false, true]);
  });

  it("is false on the solid tiles of a planned building only while it is there", () => {
    const cabin: IPlannedBuilding = {
      buildingId: "cabin",
      dateDestroyed: 30,
      datePlaced: 10,
      x: 10,
      y: 30,
    };
    const walkableOn = (x: number, y: number, firstDay: number) =>
      canWalkAt(testFarmMap, x, y, { buildings: [cabin], firstDay });

    expect([walkableOn(10, 31, 0), walkableOn(10, 31, 30)]).toEqual([
      false,
      true,
    ]);
    expect(walkableOn(10, 32, 0)).toBe(true);
  });
});
