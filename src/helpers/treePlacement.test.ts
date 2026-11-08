import { makeTestFarmMapFile, testFarmMap } from "../__mocks__/testFarmMap";
import { decodeFarmMap } from "./farmMap";
import {
  checkTreesToPlant,
  previewTreesToPlant,
  treesForRegion,
} from "./treePlacement";

function tree(
  datePlanted: number,
  overrides: Partial<IPlantedTree> = {},
): IPlantedTree {
  return {
    datePlanted,
    treeId: "apple",
    type: "tree",
    x: 0,
    y: 0,
    ...overrides,
  };
}

function parsnip(datePlanted: number, dateDestroyed?: number): IPlantedCrop {
  return {
    cropId: "parsnip",
    dateDestroyed,
    datePlanted,
    type: "crop",
    x: 0,
    y: 0,
  };
}

function scarecrow(
  dateInstalled: number,
  dateDestroyed?: number,
): IInstalledEquipment {
  return {
    dateDestroyed,
    dateInstalled,
    equipmentId: "scarecrow",
    skin: "scarecrow",
    type: "equipment",
    x: 0,
    y: 0,
  };
}

function canPlantTree(
  treeToPlant: IPlantedTree,
  plantedItems: TPlantedItem[] = [],
  equipment: IInstalledEquipment[] = [],
) {
  const { plantableTrees } = checkTreesToPlant(
    [treeToPlant],
    {
      currentCrops: { 0: { 0: plantedItems } },
      currentEquipment: { 0: { 0: equipment } },
    },
    testFarmMap,
  );

  return plantableTrees.length === 1;
}

describe("treesForRegion", () => {
  it("makes a tree for each tile of the region, row by row from the tile where the drag started", () => {
    expect(
      treesForRegion("tea_bush", { x1: 1, x2: 0, y1: 3, y2: 4 }, 9),
    ).toEqual([
      { datePlanted: 9, treeId: "tea_bush", type: "tree", x: 0, y: 4 },
      { datePlanted: 9, treeId: "tea_bush", type: "tree", x: 1, y: 4 },
      { datePlanted: 9, treeId: "tea_bush", type: "tree", x: 0, y: 3 },
      { datePlanted: 9, treeId: "tea_bush", type: "tree", x: 1, y: 3 },
    ]);
  });
});

function tilesOf(plantedTrees: readonly IPlantedTree[]) {
  return plantedTrees.map(({ x, y }) => [x, y]);
}

function plantDrag(
  treeId: string,
  from: [number, number],
  to: [number, number],
  currentCrops: IFarmCrops = {},
) {
  const region = { x1: to[0], x2: from[0], y1: to[1], y2: from[1] };

  return checkTreesToPlant(
    treesForRegion(treeId, region, 0),
    { currentCrops, currentEquipment: {} },
    testFarmMap,
  );
}

function mapWithTile(rule: string, sapling: string) {
  const file = makeTestFarmMapFile(3, 1);
  file.farm.rules.rows = [`z${rule}z`];
  file.farm.saplingRows = [`1${sapling}1`];

  return decodeFarmMap("tile", file);
}

function canPlantOn(map: IFarmMap, treeId: string) {
  return (
    checkTreesToPlant(
      [tree(0, { treeId, x: 1 })],
      { currentCrops: {}, currentEquipment: {} },
      map,
    ).plantableTrees.length === 1
  );
}

describe("the sapling tiles", () => {
  // z: tillable + buildable + floorable, w: floorable, 1: tillable,
  // N: tillable + blocked + floorable
  it.each([
    ["a sapling tile that takes a floor", "z", "1", true],
    ["a sapling tile that takes only a floor", "w", "1", true],
    ["a blocked sapling tile that takes a floor", "N", "1", false],
    ["a sapling tile that does not take a floor", "1", "1", false],
    ["a floor tile that is not a sapling tile", "z", "0", false],
  ])("on %s, plants a sapling: %s", (_, rule, sapling, can) => {
    const map = mapWithTile(rule, sapling);

    expect([canPlantOn(map, "apple"), canPlantOn(map, "tea_bush")]).toEqual([
      can,
      can,
    ]);
  });

  it.each([
    ["the greenhouse", 25, 10],
    ["the farmhouse porch", 60, 15],
    ["the pet bowl", 54, 8],
    ["the shipping bin", 72, 14],
    ["the mailbox", 68, 16],
  ])("does not plant on %s, where a floor can go", (_, x, y) => {
    expect(canPlantTree(tree(0, { treeId: "tea_bush", x, y }))).toBe(false);
  });

  it.each(["apple", "tea_bush"])(
    "shows a %s sapling on the blocked mailbox tile as red in the preview, and does not plant it",
    (treeId) => {
      const mailbox = tree(0, { treeId, x: 68, y: 16 });
      const besideMailbox = tree(0, { treeId, x: 73, y: 14 });
      const items = { currentCrops: {}, currentEquipment: {} };
      const { blockedTrees, freeTrees, unplantableTrees } = previewTreesToPlant(
        [mailbox, besideMailbox],
        items,
        testFarmMap,
      );

      expect(tilesOf(unplantableTrees)).toEqual([[68, 16]]);
      expect(tilesOf([...freeTrees, ...blockedTrees])).toEqual([[73, 14]]);
      expect(
        tilesOf(
          checkTreesToPlant([mailbox, besideMailbox], items, testFarmMap)
            .plantableTrees,
        ),
      ).toEqual([[73, 14]]);
    },
  );

  it("plants beside the greenhouse, where the game cannot till", () => {
    expect(canPlantTree(tree(0, { x: 24, y: 10 }))).toBe(true);
  });

  it("does not plant on tilled soil while a crop grows there", () => {
    const teaBush = tree(2, { treeId: "tea_bush" });

    expect(canPlantTree(teaBush, [parsnip(0)])).toBe(false);
  });
});

function canPlantNear(treeToPlant: IPlantedTree, otherTree: IPlantedTree) {
  return (
    checkTreesToPlant(
      [treeToPlant],
      {
        currentCrops: { [otherTree.y]: { [otherTree.x]: [otherTree] } },
        currentEquipment: {},
      },
      testFarmMap,
    ).plantableTrees.length === 1
  );
}

describe("the fruit tree spacing", () => {
  const center = { x: 10, y: 10 };

  it.each([
    [12, 12],
    [8, 8],
    [12, 9],
    [10, 8],
  ])("does not plant a fruit tree near a fruit tree at %i, %i", (x, y) => {
    const cherry = tree(0, { treeId: "cherry", x, y });

    expect(canPlantNear(tree(0, center), cherry)).toBe(false);
  });

  it.each([
    [13, 10],
    [10, 7],
    [13, 13],
  ])("plants a fruit tree 3 tiles from a fruit tree at %i, %i", (x, y) => {
    expect(canPlantNear(tree(0, center), tree(0, { x, y }))).toBe(true);
  });

  it("does not plant a fruit tree near a fruit tree that is planted later", () => {
    const laterTree = tree(50, { x: 11, y: 11 });

    expect(canPlantNear(tree(0, center), laterTree)).toBe(false);
  });

  it("plants a fruit tree near a fruit tree from the day that tree is destroyed", () => {
    const destroyedTree = tree(0, { dateDestroyed: 30, x: 11, y: 11 });

    expect(canPlantNear(tree(29, center), destroyedTree)).toBe(false);
    expect(canPlantNear(tree(30, center), destroyedTree)).toBe(true);
  });

  it("plants a fruit tree beside a tea bush, and a tea bush beside a fruit tree", () => {
    const appleBeside = tree(0, { x: 11, y: 10 });
    const teaBushBeside = tree(0, { treeId: "tea_bush", x: 11, y: 10 });
    const teaBush = tree(0, { ...center, treeId: "tea_bush" });

    expect(canPlantNear(tree(0, center), teaBushBeside)).toBe(true);
    expect(canPlantNear(teaBush, appleBeside)).toBe(true);
  });

  it("keeps 2 empty tiles between the fruit trees of a drag", () => {
    expect(tilesOf(plantDrag("apple", [0, 0], [6, 3]).plantableTrees)).toEqual([
      [0, 0],
      [3, 0],
      [6, 0],
      [0, 3],
      [3, 3],
      [6, 3],
    ]);
  });

  it("starts the spacing at the tile where the drag started", () => {
    expect(tilesOf(plantDrag("apple", [7, 4], [0, 0]).plantableTrees)).toEqual([
      [7, 4],
      [4, 4],
      [1, 4],
      [7, 1],
      [4, 1],
      [1, 1],
    ]);
  });

  it("keeps the spacing to the trees of the plan and of the same drag", () => {
    const cherry = tree(0, { treeId: "cherry", x: 2, y: 0 });
    const { plantableTrees } = plantDrag("apple", [0, 0], [6, 0], {
      0: { 2: [cherry] },
    });

    expect(tilesOf(plantableTrees)).toEqual([[5, 0]]);
  });

  it("plants a tea bush on each free tile of a drag", () => {
    const { plantableTrees } = plantDrag("tea_bush", [0, 0], [2, 1]);

    expect(plantableTrees).toHaveLength(6);
  });
});

function preview(
  treeToPlant: IPlantedTree,
  plantedItems: TPlantedItem[] = [],
  equipment: IInstalledEquipment[] = [],
) {
  const currentCrops: IFarmCrops = {};
  const currentEquipment: IFarmEquipment = {};

  plantedItems.forEach((item) => {
    currentCrops[item.y] = { ...currentCrops[item.y], [item.x]: [item] };
  });
  equipment.forEach((item) => {
    currentEquipment[item.y] = {
      ...currentEquipment[item.y],
      [item.x]: [item],
    };
  });

  const { blockedTrees, blockerTiles, freeTrees, unplantableTrees } =
    previewTreesToPlant(
      [treeToPlant],
      { currentCrops, currentEquipment },
      testFarmMap,
    );

  return {
    amber: tilesOf(blockedTrees),
    green: tilesOf(freeTrees),
    outlined: blockerTiles.map(({ x, y }) => [x, y]),
    red: tilesOf(unplantableTrees),
  };
}

const at = (x: number, y: number) => tree(0, { x, y });

const parsnipOn = (x: number, y: number) => ({ ...parsnip(0), x, y });

const scarecrowOn = (x: number, y: number) => ({ ...scarecrow(0), x, y });

describe("previewTreesToPlant", () => {
  it("shows a tree with nothing beside it as green", () => {
    expect(preview(at(10, 10))).toEqual({
      amber: [],
      green: [[10, 10]],
      outlined: [],
      red: [],
    });
  });

  it("shows a tree that cannot go down as red, with no outlines", () => {
    expect(preview(at(10, 10), [parsnipOn(10, 10), parsnipOn(11, 10)])).toEqual(
      { amber: [], green: [], outlined: [], red: [[10, 10]] },
    );
  });

  it("shows a fruit tree with blockers beside it on the planting day as amber, and outlines each blocker", () => {
    expect(
      preview(
        at(10, 10),
        [parsnipOn(11, 11)],
        [scarecrowOn(9, 9), scarecrowOn(12, 10)],
      ),
    ).toEqual({
      amber: [[10, 10]],
      green: [],
      outlined: [
        [9, 9],
        [11, 11],
      ],
      red: [],
    });
  });

  it("outlines the fixed building tiles beside a fruit tree", () => {
    expect(preview(at(24, 10))).toEqual({
      amber: [[24, 10]],
      green: [],
      outlined: [
        [25, 10],
        [25, 11],
      ],
      red: [],
    });
  });

  it("shows a fruit tree as green when its blockers are gone by the planting day", () => {
    expect(preview(tree(10, { x: 10, y: 10 }), [parsnipOn(11, 11)])).toEqual({
      amber: [],
      green: [[10, 10]],
      outlined: [],
      red: [],
    });
  });

  it("shows a tea bush with things beside it as green", () => {
    const teaBush = tree(0, { treeId: "tea_bush", x: 10, y: 10 });

    expect(preview(teaBush, [parsnipOn(11, 11)])).toEqual({
      amber: [],
      green: [[10, 10]],
      outlined: [],
      red: [],
    });
  });
});

const teaBushAt = (x: number) => tree(0, { treeId: "tea_bush", x });

describe("checkTreesToPlant", () => {
  it("plants on each free tile and not on the taken one", () => {
    const { plantableTrees, unplantableTrees } = checkTreesToPlant(
      [teaBushAt(0), teaBushAt(1), teaBushAt(2)],
      {
        currentCrops: { 0: { 1: [{ ...parsnip(0), x: 1 }] } },
        currentEquipment: {},
      },
      testFarmMap,
    );

    expect(plantableTrees).toEqual([teaBushAt(0), teaBushAt(2)]);
    expect(unplantableTrees).toEqual([teaBushAt(1)]);
  });

  it("does not plant where a crop grows on the planting day", () => {
    expect(canPlantTree(tree(3), [parsnip(0)])).toBe(false);
  });

  it("plants where a crop died before the planting day", () => {
    expect(canPlantTree(tree(4), [parsnip(0)])).toBe(true);
  });

  it("does not plant where a crop is planted on a later day, because a tree stays", () => {
    expect(canPlantTree(tree(0), [parsnip(112)])).toBe(false);
  });

  it("plants where a crop was destroyed on the day it was planted", () => {
    expect(canPlantTree(tree(0), [parsnip(5, 5)])).toBe(true);
  });

  it("does not plant where another tree grows, or will grow", () => {
    expect(canPlantTree(tree(30), [tree(0)])).toBe(false);
    expect(canPlantTree(tree(0), [tree(30)])).toBe(false);
  });

  it("plants from the day another tree is destroyed", () => {
    const destroyedTree = tree(0, { dateDestroyed: 30, treeId: "tea_bush" });

    expect(canPlantTree(tree(29), [destroyedTree])).toBe(false);
    expect(canPlantTree(tree(30), [destroyedTree])).toBe(true);
  });

  it("does not plant where equipment is on the tile on the planting day or later", () => {
    expect(canPlantTree(tree(5), [], [scarecrow(0)])).toBe(false);
    expect(canPlantTree(tree(5), [], [scarecrow(0, 6)])).toBe(false);
    expect(canPlantTree(tree(5), [], [scarecrow(40)])).toBe(false);
  });

  it("plants from the day the equipment is removed", () => {
    expect(canPlantTree(tree(5), [], [scarecrow(0, 5)])).toBe(true);
  });

  it("does not plant on a floor", () => {
    const floor: IInstalledEquipment = {
      ...scarecrow(0),
      equipmentId: "flooring",
      skin: "wood_floor",
    };

    expect(canPlantTree(tree(5), [], [floor])).toBe(false);
  });
});

function canPlantWith(
  treeToPlant: IPlantedTree,
  currentBuildings: IPlannedBuilding[],
) {
  return (
    checkTreesToPlant(
      [treeToPlant],
      { currentBuildings, currentCrops: {}, currentEquipment: {} },
      testFarmMap,
    ).plantableTrees.length === 1
  );
}

describe("trees on a planned building tile", () => {
  const barn: IPlannedBuilding = {
    buildingId: "barn",
    dateDestroyed: 30,
    datePlaced: 10,
    x: 0,
    y: 0,
  };

  it("does not plant a tree on the footprint before or while the building is there", () => {
    expect(canPlantWith(tree(0), [barn])).toBe(false);
    expect(canPlantWith(tree(12), [barn])).toBe(false);
  });

  it("plants a tree on the footprint after the building is demolished", () => {
    expect(canPlantWith(tree(30), [barn])).toBe(true);
  });

  it("does not plant a tree on a building tile that the player can walk on", () => {
    const stable: IPlannedBuilding = {
      buildingId: "stable",
      datePlaced: 10,
      x: 9,
      y: 9,
    };

    expect(canPlantWith(tree(20, { x: 10, y: 10 }), [stable])).toBe(false);
    expect(canPlantWith(tree(20, { x: 13, y: 10 }), [stable])).toBe(true);
  });
});
