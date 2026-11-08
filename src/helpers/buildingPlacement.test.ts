import { makeTestFarmMapFile, testFarmMap } from "../__mocks__/testFarmMap";
import {
  checkBuildingToPlace,
  removeFloors,
  restoreFloors,
  withEndedFloors,
} from "./buildingPlacement";
import { decodeFarmMap } from "./farmMap";

function building(
  buildingId: string,
  x: number,
  y: number,
  overrides: Partial<IPlannedBuilding> = {},
): IPlannedBuilding {
  return { buildingId, datePlaced: 10, x, y, ...overrides };
}

function equipment(
  equipmentId: string,
  skin: string,
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId,
    skin,
    type: "equipment",
    x,
    y,
    ...overrides,
  };
}

const woodFloor = (
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
) => equipment("flooring", "wood_floor", x, y, overrides);

function parsnip(
  x: number,
  y: number,
  overrides: Partial<IPlantedCrop> = {},
): IPlantedCrop {
  return {
    cropId: "parsnip",
    datePlanted: 10,
    type: "crop",
    x,
    y,
    ...overrides,
  };
}

const greenBean = (x: number, y: number) =>
  parsnip(x, y, { cropId: "green_bean" });

// N: tillable + blocked + floorable (a NoFurniture tile), g: blocked,
// k: blocked + water
function mapWithTile({ x, y }: IFarmTile, flags: string) {
  const file = makeTestFarmMapFile();
  const row = file.farm.rules.rows[y];
  file.farm.rules.rows[y] = row.slice(0, x) + flags + row.slice(x + 1);

  return decodeFarmMap("tile", file);
}

function byTile<T extends IFarmTile>(farmItems: readonly T[]) {
  const byRow: IFarmItems<T[]> = {};

  farmItems.forEach((farmItem) => {
    byRow[farmItem.y] = {
      ...byRow[farmItem.y],
      [farmItem.x]: [...(byRow[farmItem.y]?.[farmItem.x] ?? []), farmItem],
    };
  });

  return byRow;
}

interface IPlanThings {
  buildings?: IPlannedBuilding[];
  crops?: TPlantedItem[];
  equipment?: IInstalledEquipment[];
}

function check(
  plannedBuilding: IPlannedBuilding,
  { buildings = [], crops = [], equipment: installed = [] }: IPlanThings = {},
  farmMap = testFarmMap,
) {
  return checkBuildingToPlace(
    plannedBuilding,
    {
      currentBuildings: buildings,
      currentCrops: byTile(crops),
      currentEquipment: byTile(installed),
    },
    farmMap,
  );
}

// A barn at 10, 30 has its footprint at x 10-16 and y 30-33, and the tile
// below its door at 11, 34.
const barn = building("barn", 10, 30);
const barnDoorTile = { x: 11, y: 34 };

describe("checkBuildingToPlace", () => {
  it("fits a barn on open ground, with all of its footprint free", () => {
    const result = check(barn);

    expect(result.fits).toBe(true);
    expect(result.blockedTiles).toEqual([]);
    expect(result.freeTiles).toHaveLength(7 * 4);
  });

  it("blocks the tiles on a fixed building", () => {
    const result = check(building("barn", 54, 9));

    expect(result.fits).toBe(false);
    expect(result.blockedTiles).toEqual([
      { x: 59, y: 12 },
      { x: 60, y: 12 },
    ]);
  });

  it("blocks the tiles off the map", () => {
    const result = check(building("silo", 78, 0));

    expect(result.blockedTiles).toEqual([
      { x: 80, y: 0 },
      { x: 80, y: 1 },
      { x: 80, y: 2 },
    ]);
  });

  it.each<[string, TPlantedItem]>([
    ["a crop on the order day", parsnip(12, 31, { datePlanted: 8 })],
    ["a crop on a later day", parsnip(12, 31, { datePlanted: 20 })],
    [
      "a sapling",
      { datePlanted: 2, treeId: "apple", type: "tree", x: 12, y: 31 },
    ],
  ])("blocks a footprint tile with %s", (_, crop) => {
    const result = check(barn, { crops: [crop] });

    expect(result.fits).toBe(false);
    expect(result.blockedTiles).toEqual([{ x: 12, y: 31 }]);
  });

  it("does not block a tile with a crop that is gone before the order day", () => {
    expect(
      check(barn, { crops: [parsnip(12, 31, { datePlanted: 0 })] }).fits,
    ).toBe(true);
  });

  it("does not block a tile with a crop that is destroyed on the day it is planted", () => {
    expect(
      check(barn, {
        crops: [parsnip(12, 31, { dateDestroyed: 20, datePlanted: 20 })],
      }).fits,
    ).toBe(true);
  });

  it.each([
    ["a scarecrow", equipment("scarecrow", "scarecrow", 16, 33)],
    ["a fence", equipment("fence", "wood_fence", 16, 33)],
    [
      "a chest put down on a later day",
      equipment("chest", "chest", 16, 33, { dateInstalled: 90 }),
    ],
  ])("blocks a footprint tile with %s", (_, installed) => {
    expect(check(barn, { equipment: [installed] }).blockedTiles).toEqual([
      { x: 16, y: 33 },
    ]);
  });

  it("does not block a tile with a thing that is gone on the order day", () => {
    expect(
      check(barn, {
        equipment: [
          equipment("scarecrow", "scarecrow", 16, 33, { dateDestroyed: 10 }),
        ],
      }).fits,
    ).toBe(true);
  });

  it("keeps the floors under a barn", () => {
    const result = check(barn, {
      equipment: [woodFloor(10, 30), woodFloor(16, 33, { dateInstalled: 50 })],
    });

    expect(result.fits).toBe(true);
    expect(result.removedFloors).toEqual([]);
  });

  describe("the Well, whose tile rules take the floors away", () => {
    const well = building("well", 10, 30);

    it("goes down on the floors that are there on the order day, and removes them", () => {
      const floors = [
        woodFloor(11, 31),
        woodFloor(12, 32, { dateInstalled: 10 }),
      ];
      const result = check(well, { equipment: floors });

      expect(result.fits).toBe(true);
      expect(result.removedFloors).toEqual(floors);
    });

    it("blocks a tile with a floor that is put down on a later day", () => {
      const result = check(well, {
        equipment: [woodFloor(11, 31, { dateInstalled: 20 })],
      });

      expect(result.blockedTiles).toEqual([{ x: 11, y: 31 }]);
      expect(result.removedFloors).toEqual([]);
    });

    it("does not remove a floor that is gone by the order day", () => {
      const result = check(well, {
        equipment: [woodFloor(11, 31, { dateDestroyed: 10 })],
      });

      expect(result.fits).toBe(true);
      expect(result.removedFloors).toEqual([]);
    });

    it("still blocks a tile with an item on a floor", () => {
      expect(
        check(well, {
          equipment: [
            woodFloor(11, 31),
            equipment("scarecrow", "scarecrow", 11, 31),
          ],
        }).blockedTiles,
      ).toEqual([{ x: 11, y: 31 }]);
    });
  });

  it.each([
    ["on the order day", building("silo", 16, 28, { datePlaced: 2 })],
    ["on a later day", building("silo", 16, 28, { datePlaced: 50 })],
  ])("blocks the tiles of another building that is there %s", (_, silo) => {
    expect(check(barn, { buildings: [silo] }).blockedTiles).toEqual([
      { x: 16, y: 30 },
    ]);
  });

  it("does not block the tiles of a building that is demolished by the order day", () => {
    const silo = building("silo", 16, 28, {
      dateDestroyed: 10,
      datePlaced: 2,
    });

    expect(check(barn, { buildings: [silo] }).fits).toBe(true);
  });

  it("does not block a building with itself, so a building in the plan still fits", () => {
    expect(check(barn, { buildings: [barn] }).fits).toBe(true);
  });

  it("ends the check on the day that the building is demolished", () => {
    const demolished = { ...barn, dateDestroyed: 20 };

    expect(
      check(demolished, { crops: [parsnip(12, 31, { datePlanted: 20 })] }).fits,
    ).toBe(true);
  });

  describe("the tile below the door", () => {
    it.each([
      [
        "a crop on a trellis",
        { crops: [greenBean(barnDoorTile.x, barnDoorTile.y)] },
      ],
      [
        "a fruit tree",
        {
          crops: [
            {
              datePlanted: 2,
              treeId: "apple",
              type: "tree",
              x: barnDoorTile.x,
              y: barnDoorTile.y,
            } satisfies IPlantedTree,
          ],
        },
      ],
      [
        "a scarecrow on a later day",
        {
          equipment: [
            equipment(
              "scarecrow",
              "scarecrow",
              barnDoorTile.x,
              barnDoorTile.y,
              {
                dateInstalled: 60,
              },
            ),
          ],
        },
      ],
      [
        "another building",
        {
          buildings: [building("shipping_bin", barnDoorTile.x, barnDoorTile.y)],
        },
      ],
      [
        "a solid tile of a Pet Bowl",
        {
          buildings: [building("pet_bowl", barnDoorTile.x - 1, barnDoorTile.y)],
        },
      ],
    ])("blocks a barn when %s is on it", (_, things: IPlanThings) => {
      const result = check(barn, things);

      expect(result.fits).toBe(false);
      expect(result.blockedTiles).toEqual([barnDoorTile]);
      expect(result.freeTiles).toHaveLength(7 * 4);
    });

    it.each([
      ["a floor", { equipment: [woodFloor(barnDoorTile.x, barnDoorTile.y)] }],
      [
        "a Torch",
        {
          equipment: [
            equipment("torch", "torch", barnDoorTile.x, barnDoorTile.y),
          ],
        },
      ],
      [
        "a Spirit Torch",
        {
          equipment: [
            equipment(
              "spirit_torch",
              "spirit_torch",
              barnDoorTile.x,
              barnDoorTile.y,
            ),
          ],
        },
      ],
      ["a crop", { crops: [parsnip(barnDoorTile.x, barnDoorTile.y)] }],
      [
        "the open tile of a Pet Bowl",
        {
          buildings: [building("pet_bowl", barnDoorTile.x, barnDoorTile.y)],
        },
      ],
    ])(
      "lets a barn have %s on it, which the player can walk over",
      (_, things: IPlanThings) => {
        expect(check(barn, things).fits).toBe(true);
      },
    );

    it("lets a barn have a NoFurniture tile there, which stops items but not the player", () => {
      expect(check(barn, {}, mapWithTile(barnDoorTile, "N")).fits).toBe(true);
    });

    it.each([
      ["a tile that the player cannot walk on", "g"],
      ["water", "k"],
    ])("blocks a barn when the tile is %s", (_, flags) => {
      expect(
        check(barn, {}, mapWithTile(barnDoorTile, flags)).blockedTiles,
      ).toEqual([barnDoorTile]);
    });

    it("blocks a barn when the tile is off the map", () => {
      expect(check(building("barn", 10, 61)).blockedTiles).toEqual([
        { x: 11, y: 65 },
      ]);
    });

    it("blocks a barn when the tile is a solid tile of a fixed building", () => {
      const { farmhouse } = testFarmMap.spots;

      expect(
        check(building("barn", farmhouse.x, farmhouse.y - 4)).blockedTiles,
      ).toEqual([{ x: farmhouse.x + 1, y: farmhouse.y }]);
    });

    it("is not checked for a building with no door", () => {
      expect(
        check(building("silo", 10, 30), {
          equipment: [equipment("scarecrow", "scarecrow", 11, 33)],
        }).fits,
      ).toBe(true);
    });

    it("is in the footprint of the Cabin, so the footprint check covers it", () => {
      const cabin = building("cabin", 10, 30);
      const result = check(cabin, { crops: [parsnip(12, 32)] });

      expect(result.blockedTiles).toEqual([{ x: 12, y: 32 }]);
      expect(result.freeTiles).toHaveLength(5 * 3 - 1);
      expect(
        check(cabin, {
          equipment: [equipment("scarecrow", "scarecrow", 12, 33)],
        }).fits,
      ).toBe(true);
    });
  });
});

const blockerOf = (...args: Parameters<typeof check>) => check(...args).blocker;

describe("the blocker of checkBuildingToPlace", () => {
  it("has no blocker when the building fits", () => {
    expect(blockerOf(barn)).toBeUndefined();
  });

  it.each<[string, IPlanThings, { date: number; thing: string }]>([
    [
      "a crop on the order day",
      { crops: [parsnip(12, 31, { datePlanted: 8 })] },
      { date: 10, thing: "crop" },
    ],
    [
      "a crop on a later day",
      { crops: [parsnip(12, 31, { datePlanted: 20 })] },
      { date: 20, thing: "crop" },
    ],
    [
      "a fruit tree",
      {
        crops: [
          { datePlanted: 2, treeId: "apple", type: "tree", x: 12, y: 31 },
        ],
      },
      { date: 10, thing: "tree" },
    ],
    [
      "a tea bush",
      {
        crops: [
          { datePlanted: 30, treeId: "tea_bush", type: "tree", x: 12, y: 31 },
        ],
      },
      { date: 30, thing: "bush" },
    ],
    [
      "an item",
      {
        equipment: [equipment("chest", "chest", 16, 33, { dateInstalled: 90 })],
      },
      { date: 90, thing: "item" },
    ],
  ])("names %s and its first day", (_, things, expected) => {
    expect(blockerOf(barn, things)).toEqual({ ...expected, type: "thing" });
  });

  it("names a floor that goes under a Well on a later day", () => {
    expect(
      blockerOf(building("well", 10, 30), {
        equipment: [woodFloor(11, 31, { dateInstalled: 20 })],
      }),
    ).toEqual({ date: 20, thing: "floor", type: "thing" });
  });

  it("names a fixed building", () => {
    expect(blockerOf(building("barn", 54, 9))).toEqual({
      buildingId: "farmhouse",
      date: 10,
      isFixed: true,
      type: "building",
    });
  });

  it("names a planned building with the tier that stands on its first day", () => {
    const silo = building("silo", 16, 28, { datePlaced: 50 });
    const coop = building("coop", 14, 31, {
      datePlaced: 0,
      upgrades: [{ buildingId: "big_coop", datePlaced: 3 }],
    });

    expect(blockerOf(barn, { buildings: [silo] })).toEqual({
      buildingId: "silo",
      date: 50,
      isFixed: false,
      type: "building",
    });
    expect(blockerOf(barn, { buildings: [coop] })).toEqual({
      buildingId: "big_coop",
      date: 10,
      isFixed: false,
      type: "building",
    });
  });

  it("names water and ground that does not take a building", () => {
    expect(blockerOf(barn, {}, mapWithTile({ x: 12, y: 31 }, "k"))).toEqual({
      type: "water",
    });
    expect(blockerOf(barn, {}, mapWithTile({ x: 12, y: 31 }, "g"))).toEqual({
      type: "ground",
    });
    expect(blockerOf(building("silo", 78, 0))).toEqual({ type: "ground" });
  });

  it("names the tile below the door after the footprint", () => {
    const doorBlocker = equipment(
      "scarecrow",
      "scarecrow",
      barnDoorTile.x,
      barnDoorTile.y,
    );

    expect(blockerOf(barn, { equipment: [doorBlocker] })).toEqual({
      type: "door",
    });
    expect(
      blockerOf(barn, {
        crops: [parsnip(12, 31)],
        equipment: [doorBlocker],
      }),
    ).toEqual({ date: 10, thing: "crop", type: "thing" });
  });
});

describe("removeFloors", () => {
  const floor = woodFloor(11, 31, { dateDestroyed: 30 });
  const laterFloor = woodFloor(11, 31, { dateInstalled: 40 });
  const otherFloor = woodFloor(12, 31);
  const currentEquipment = byTile([floor, laterFloor, otherFloor]);

  it("ends the floors on the date, and keeps the other things", () => {
    expect(removeFloors(currentEquipment, [floor], 10)).toEqual(
      byTile([{ ...floor, dateDestroyed: 10 }, laterFloor, otherFloor]),
    );
  });

  it("does not change the equipment that it gets", () => {
    removeFloors(currentEquipment, [floor, otherFloor], 10);

    expect(currentEquipment).toEqual(byTile([floor, laterFloor, otherFloor]));
    expect([floor.dateDestroyed, otherFloor.dateDestroyed]).toEqual([
      30,
      undefined,
    ]);
  });
});

describe("withEndedFloors", () => {
  const well = building("well", 10, 30);

  it("keeps the tile, the start day and the end day that each floor had before the building", () => {
    expect(
      withEndedFloors(well, [
        woodFloor(11, 31),
        woodFloor(12, 32, { dateDestroyed: 20, dateInstalled: 4 }),
      ]),
    ).toEqual({
      ...well,
      endedFloors: [
        { dateInstalled: 0, x: 11, y: 31 },
        { dateDestroyed: 20, dateInstalled: 4, x: 12, y: 32 },
      ],
    });
  });

  it("keeps the building as it is when it takes off no floors", () => {
    expect(withEndedFloors(well, [])).toBe(well);
  });
});

describe("restoreFloors", () => {
  // The Well is ordered on day 10 at 10, 30, so it covers x 10-12, y 30-32.
  const well = building("well", 10, 30, {
    endedFloors: [{ dateInstalled: 0, x: 11, y: 31 }],
  });
  const removedFloor = woodFloor(11, 31, { dateDestroyed: 10 });

  function restore(
    installed: IInstalledEquipment[],
    crops: TPlantedItem[] = [],
    cancelled = [well],
  ) {
    return restoreFloors(
      { currentCrops: byTile(crops), currentEquipment: byTile(installed) },
      cancelled,
    );
  }

  it("gives back the floors that a Well took off when it leaves the plan", () => {
    expect(restore([removedFloor])).toEqual(byTile([woodFloor(11, 31)]));
  });

  it("gives back each floor with the end day that it had before the Well", () => {
    const path = woodFloor(12, 32, { dateDestroyed: 10, dateInstalled: 4 });
    const wellOnPaths = building("well", 10, 30, {
      endedFloors: [
        { dateInstalled: 0, x: 11, y: 31 },
        { dateDestroyed: 20, dateInstalled: 4, x: 12, y: 32 },
      ],
    });

    expect(restore([removedFloor, path], [], [wellOnPaths])).toEqual(
      byTile([
        woodFloor(11, 31),
        woodFloor(12, 32, { dateDestroyed: 20, dateInstalled: 4 }),
      ]),
    );
  });

  it("keeps a floor that the plan ended on the order day before the Well went down", () => {
    const erasedFloor = woodFloor(12, 31, { dateDestroyed: 10 });

    expect(restore([removedFloor, erasedFloor])).toEqual(
      byTile([woodFloor(11, 31), erasedFloor]),
    );
  });

  it("keeps the floors that ended on another day or are out of the footprint", () => {
    const endedBefore = woodFloor(11, 31, { dateDestroyed: 5 });
    const outside = woodFloor(13, 31, { dateDestroyed: 10 });

    expect(restore([endedBefore, outside])).toEqual(
      byTile([endedBefore, outside]),
    );
  });

  it("ends a floor that comes back on the day the next thing on its tile starts", () => {
    const laterFloor = woodFloor(11, 31, { dateInstalled: 40 });
    const wellOnPath = building("well", 10, 30, {
      endedFloors: [{ dateDestroyed: 30, dateInstalled: 0, x: 11, y: 31 }],
    });

    expect(restore([removedFloor, laterFloor])).toEqual(
      byTile([woodFloor(11, 31, { dateDestroyed: 40 }), laterFloor]),
    );
    expect(
      restore([removedFloor], [parsnip(11, 31, { datePlanted: 25 })]),
    ).toEqual(byTile([woodFloor(11, 31, { dateDestroyed: 25 })]));
    expect(
      restore(
        [removedFloor],
        [parsnip(11, 31, { datePlanted: 25 })],
        [wellOnPath],
      ),
    ).toEqual(byTile([woodFloor(11, 31, { dateDestroyed: 25 })]));
    expect(restore([removedFloor, laterFloor], [], [wellOnPath])).toEqual(
      byTile([woodFloor(11, 31, { dateDestroyed: 30 }), laterFloor]),
    );
  });

  it("gives back no floors for a building that took none, or with no cancelled order", () => {
    const barnFloor = woodFloor(11, 31, { dateDestroyed: 10 });

    expect(restore([barnFloor], [], [building("barn", 10, 30)])).toEqual(
      byTile([barnFloor]),
    );
    expect(restore([removedFloor], [], [building("well", 10, 30)])).toEqual(
      byTile([removedFloor]),
    );
    expect(restore([removedFloor], [], [])).toEqual(byTile([removedFloor]));
  });
});
