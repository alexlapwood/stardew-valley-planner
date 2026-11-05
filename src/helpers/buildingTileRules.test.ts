import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { buildings } from "../data/game/buildings.json";
import { applyBuildingTileRules, getPlacementFlags } from "./buildingTileRules";
import { decodeFarmMap } from "./farmMap";

const tillable = 1;
const buildable = 2;
const water = 4;
const noSprinklers = 8;
const blocked = 16;
const floorable = 32;

function mapWithRows(rows: string[]) {
  const file = makeTestFarmMapFile(rows[0].length, rows.length);
  file.farm.rules.rows = rows;

  return decodeFarmMap("rules", file);
}

function ruledBuilding(
  x: number,
  y: number,
  tileRules: IBuildingTileRules,
  size = 1,
) {
  return {
    building: { ...buildings.shed, buildingId: "Test", tileRules },
    spot: { height: size, width: size, x, y },
  };
}

function flagsByRow(map: IFarmMap, flags: Uint8Array) {
  return Array.from({ length: map.height }, (_, y) => [
    ...flags.subarray(y * map.width, (y + 1) * map.width),
  ]);
}

describe("applyBuildingTileRules", () => {
  it("sets and clears the flags of each key, from radius tiles above and to the left of the spot", () => {
    const map = mapWithRows(["3333", "3333", "3333"]);
    const building = ruledBuilding(2, 1, {
      changes: {
        a: { blocked: true },
        b: { tillable: false },
        c: { noSprinklers: true },
      },
      radius: 1,
      rows: [".a.", "b.c", "..."],
    });

    expect(flagsByRow(map, applyBuildingTileRules(map, [building]))).toEqual([
      [3, 3, tillable | blocked, 3],
      [3, buildable, 3, 3 | noSprinklers],
      [3, 3, 3, 3],
    ]);
  });

  it("does not change the flags of the map", () => {
    const map = mapWithRows(["0"]);
    const building = ruledBuilding(0, 0, {
      changes: { a: { tillable: true } },
      radius: 0,
      rows: ["a"],
    });

    applyBuildingTileRules(map, [building]);

    expect([...map.flags]).toEqual([0]);
  });

  it.each([
    ["the set first", true],
    ["the clear first", false],
  ])(
    "gives a clear from one building the win over a set from another, with %s",
    (_, setFirst) => {
      const map = mapWithRows(["0"]);
      const setter = ruledBuilding(0, 0, {
        changes: { a: { floorable: true, tillable: true } },
        radius: 0,
        rows: ["a"],
      });
      const clearer = ruledBuilding(0, 0, {
        changes: { a: { tillable: false } },
        radius: 0,
        rows: ["a"],
      });
      const ordered = setFirst ? [setter, clearer] : [clearer, setter];

      expect([...applyBuildingTileRules(map, ordered)]).toEqual([floorable]);
    },
  );

  it("clears buildable on each blocked tile, also when a building sets it", () => {
    const map = mapWithRows(["gi3"]);
    const building = ruledBuilding(0, 0, {
      changes: { a: { buildable: true }, b: { blocked: true } },
      radius: 0,
      rows: ["a.b"],
    });

    expect([...applyBuildingTileRules(map, [building])]).toEqual([
      blocked,
      blocked,
      tillable | blocked,
    ]);
  });

  it("skips the tiles off the map, and does not put them on the other side of the map", () => {
    const map = mapWithRows(["000", "000"]);
    const building = ruledBuilding(0, 0, {
      changes: { a: { blocked: true } },
      radius: 1,
      rows: ["aaa", "aaa", "aaa"],
    });

    expect(flagsByRow(map, applyBuildingTileRules(map, [building]))).toEqual([
      [blocked, blocked, 0],
      [blocked, blocked, 0],
    ]);
  });

  it("never changes the water flag", () => {
    const map = mapWithRows(["40"]);
    const building = ruledBuilding(0, 0, {
      changes: { a: { tillable: true, water: false }, b: { water: true } },
      radius: 0,
      rows: ["ab"],
    });

    expect([...applyBuildingTileRules(map, [building])]).toEqual([
      water | tillable,
      0,
    ]);
  });

  it("throws on a key that has no change", () => {
    const map = mapWithRows(["0"]);
    const building = ruledBuilding(0, 0, {
      changes: {},
      radius: 0,
      rows: ["x"],
    });

    expect(() => applyBuildingTileRules(map, [building])).toThrow(
      'The Test tile rules have no change for "x".',
    );
  });
});

describe("getPlacementFlags", () => {
  const greenhouseWall = blocked | floorable;
  const openTile = tillable | buildable | floorable;

  it("applies the rules of the default buildings at their spots", () => {
    const map = decodeFarmMap("farm", makeTestFarmMapFile());
    const flags = getPlacementFlags(map);

    expect([flags[10 * map.width + 25], flags[10 * map.width + 22]]).toEqual([
      greenhouseWall,
      openTile,
    ]);
  });

  it("works the flags out one time for each farm and its spots", () => {
    const map = decodeFarmMap("farm", makeTestFarmMapFile());
    const flags = getPlacementFlags(map);

    expect(getPlacementFlags(map)).toBe(flags);

    map.spots = {
      ...map.spots,
      greenhouse: { ...map.spots.greenhouse, x: 40 },
    };
    const movedFlags = getPlacementFlags(map);

    expect(movedFlags).not.toBe(flags);
    expect([
      movedFlags[10 * map.width + 25],
      movedFlags[10 * map.width + 40],
    ]).toEqual([openTile, greenhouseWall]);
  });
});
