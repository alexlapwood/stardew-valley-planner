import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { buildings } from "../data/game/buildings.json";
import {
  applyBuildingTileRules,
  getPlacementFlags,
  getPlacementFlagsOn,
  getTileFlagsOverDays,
} from "./buildingTileRules";
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

describe("getPlacementFlagsOn", () => {
  const map = decodeFarmMap("farm", makeTestFarmMapFile());
  const openTile = tillable | buildable | floorable;
  const barnTile = blocked | floorable;
  const cellOf = (x: number, y: number) => y * map.width + x;
  const barn: IPlannedBuilding = {
    buildingId: "barn",
    dateDestroyed: 20,
    datePlaced: 5,
    x: 10,
    y: 30,
  };

  it("applies the rules of a planned building from its order day to the day before it is destroyed", () => {
    expect(
      [4, 5, 19, 20].map(
        (date) => getPlacementFlagsOn(map, [barn], date)[cellOf(12, 31)],
      ),
    ).toEqual([openTile, barnTile, barnTile, openTile]);
  });

  // The tiers of a game building share their tile rules, so this test gives
  // the Big Barn its own rules for a while.
  it("applies the rules of the tier that stands on each date", () => {
    const bigBarn = buildings.big_barn;
    const { changes } = bigBarn.tileRules;
    buildings.big_barn = {
      ...bigBarn,
      tileRules: {
        ...bigBarn.tileRules,
        changes: { a: { ...changes.a, floorable: false } },
      },
    };

    try {
      const upgraded: IPlannedBuilding = {
        ...barn,
        upgrades: [{ buildingId: "big_barn", datePlaced: 10 }],
      };

      expect(
        [5, 9, 10, 19].map(
          (date) => getPlacementFlagsOn(map, [upgraded], date)[cellOf(12, 31)],
        ),
      ).toEqual([barnTile, barnTile, blocked, blocked]);
    } finally {
      buildings.big_barn = bigBarn;
    }
  });

  it("keeps the rules of the fixed buildings", () => {
    expect(getPlacementFlagsOn(map, [barn], 5)[10 * map.width + 25]).toBe(
      blocked | floorable,
    );
  });

  it("gives the flags of the fixed buildings when the plan has no buildings", () => {
    expect(getPlacementFlagsOn(map, [], 5)).toBe(getPlacementFlags(map));
  });

  it("works the flags out one time for each set of days with the same buildings", () => {
    const buildings = [barn];

    expect(getPlacementFlagsOn(map, buildings, 6)).toBe(
      getPlacementFlagsOn(map, buildings, 19),
    );
    expect(getPlacementFlagsOn(map, buildings, 6)).not.toBe(
      getPlacementFlagsOn(map, buildings, 20),
    );
    expect(getPlacementFlagsOn(map, buildings, 4)).toBe(getPlacementFlags(map));
    expect(getPlacementFlagsOn(map, buildings, 30)).toBe(
      getPlacementFlags(map),
    );
  });
});

describe("getTileFlagsOverDays", () => {
  const map = decodeFarmMap("farm", makeTestFarmMapFile());
  const openTile = tillable | buildable | floorable;
  const barn: IPlannedBuilding = {
    buildingId: "barn",
    dateDestroyed: 20,
    datePlaced: 5,
    x: 10,
    y: 30,
  };

  it.each([
    ["before the building", { firstDay: 0, lastDay: 4 }, openTile, openTile],
    [
      "into the building days",
      { firstDay: 0, lastDay: 5 },
      floorable,
      openTile | blocked,
    ],
    ["with no end", { firstDay: 0 }, floorable, openTile | blocked],
    ["after the building", { firstDay: 20 }, openTile, openTile],
  ])(
    "gives the flags on every day and on some day %s",
    (_, days, onEveryDay, onSomeDay) => {
      expect(getTileFlagsOverDays(map, [barn], { x: 12, y: 31 }, days)).toEqual(
        { onEveryDay, onSomeDay },
      );
    },
  );
});
