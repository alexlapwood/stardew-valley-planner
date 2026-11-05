import {
  makeTestFarmMapFile,
  testFarmMap,
  testRuleFlags,
} from "../__mocks__/testFarmMap";
import { getScarecrowMap, getSoilMap } from "./farm";
import { decodeFarmMap } from "./farmMap";
import { canInstallAt, canPlantAt } from "./placementRules";

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
});
