import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { checkBuildingOrder, findNextOrderDate } from "./buildingOrders";
import { checkBuildingToPlace } from "./buildingPlacement";
import { describeRefusal } from "./buildingReasons";
import { getScarecrowMap, getWateredSoilMap } from "./farm";
import { decodeFarmMap } from "./farmMap";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  type ICurrentItems,
} from "./itemPlacement";
import { getJunimoAreaMap } from "./junimoArea";
import { toPlacedBuilding } from "./plannedBuildings";
import { getTreeSchedule } from "./treeGrowth";
import { checkTreesToPlant } from "./treePlacement";

// The bush covers the tiles 20, 40 and 21, 40.
const bush: IFarmBush = { destroyable: true, size: "medium", x: 20, y: 40 };
const bushTile = { x: 21, y: 40 };
const cutOn = (dateCut: number): ICutBush => ({ dateCut, x: 20, y: 40 });

function mapWithBushes(bushes: IFarmBush[]) {
  const file = makeTestFarmMapFile();
  file.farm.bushes = bushes;

  return decodeFarmMap("bushes", file);
}

const farmMap = mapWithBushes([bush]);

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

function planWith(
  cutBushes: ICutBush[] = [],
  equipment: IInstalledEquipment[] = [],
): ICurrentItems {
  return {
    currentBuildings: [],
    currentCrops: {},
    currentCutBushes: cutBushes,
    currentEquipment: byTile(equipment),
  };
}

function parsnip(date: number, { x, y } = bushTile): IPlantedCrop {
  return { cropId: "parsnip", datePlanted: date, type: "crop", x, y };
}

function equipment(
  equipmentId: string,
  skin: string,
  date: number,
  { x, y } = bushTile,
): IInstalledEquipment {
  return { dateInstalled: date, equipmentId, skin, type: "equipment", x, y };
}

function apple(date: number, { x, y } = bushTile): IPlantedTree {
  return { datePlanted: date, treeId: "apple", type: "tree", x, y };
}

const canPlantCrop = (crop: IPlantedCrop, cuts: ICutBush[] = []) =>
  checkCropsToPlant([crop], planWith(cuts), farmMap).plantableCrops.length ===
  1;

const canPlantApple = (date: number, cuts: ICutBush[] = []) =>
  checkTreesToPlant([apple(date)], planWith(cuts), farmMap).plantableTrees
    .length === 1;

// A barn at 20, 37 has its bottom row on the row of the bush.
const barnOn = (date: number): IPlannedBuilding => ({
  buildingId: "barn",
  datePlaced: date,
  x: 20,
  y: 37,
});

const hasBushTiles = (tileMap: (number | undefined)[][]) =>
  [bush, bushTile].map(({ x, y }) => tileMap[x]?.[y] !== undefined);

describe("a bush of the farm map", () => {
  describe("crops", () => {
    it("takes no crop on its tiles, because the game cannot hoe them", () => {
      expect(canPlantCrop(parsnip(5))).toBe(false);
      expect(canPlantCrop(parsnip(5, { x: 20, y: 40 }))).toBe(false);
    });

    it("takes a crop on the rows above it, which only its sprite covers", () => {
      expect(canPlantCrop(parsnip(5, { x: 21, y: 39 }))).toBe(true);
    });

    it("takes a crop from the date of the cut, and not before it", () => {
      expect(canPlantCrop(parsnip(9), [cutOn(10)])).toBe(false);
      expect(canPlantCrop(parsnip(10), [cutOn(10)])).toBe(true);
      expect(canPlantCrop(parsnip(30), [cutOn(10)])).toBe(true);
    });
  });

  describe("items and floors", () => {
    it.each([
      ["an item", "scarecrow", "scarecrow"],
      ["a sprinkler", "sprinkler", "iridium_sprinkler"],
      ["a fence", "fence", "wood_fence"],
      ["a floor", "flooring", "wood_floor"],
    ])("takes %s only from the date of the cut", (_, equipmentId, skin) => {
      const canInstall = (date: number, cuts: ICutBush[] = []) =>
        checkEquipmentToInstall(
          [equipment(equipmentId, skin, date)],
          planWith(cuts),
          farmMap,
        ).installableEquipment.length === 1;

      expect(canInstall(5)).toBe(false);
      expect(canInstall(9, [cutOn(10)])).toBe(false);
      expect(canInstall(10, [cutOn(10)])).toBe(true);
    });
  });

  describe("trees", () => {
    it("takes no sapling on its tiles until the date of the cut", () => {
      expect(canPlantApple(5)).toBe(false);
      expect(canPlantApple(9, [cutOn(10)])).toBe(false);
      expect(canPlantApple(10, [cutOn(10)])).toBe(true);
    });

    it("stops a fruit tree beside it from growing until it is cut (FruitTree.IsGrowthBlocked)", () => {
      const tree = apple(0, { x: 22, y: 41 });
      const schedule = (cuts: ICutBush[]) =>
        getTreeSchedule({ ...planWith(cuts), farmMap }, tree);

      expect(schedule([]).matureDate).toBeUndefined();
      expect(schedule([cutOn(30)]).matureDate).toBe(30 + 28);
    });
  });

  describe("buildings", () => {
    it("blocks the tiles of a building on it, and names the bush as the cause", () => {
      const check = checkBuildingToPlace(barnOn(5), planWith(), farmMap);

      expect(check.fits).toBe(false);
      expect(check.blockedTiles).toEqual([
        { x: 20, y: 40 },
        { x: 21, y: 40 },
      ]);
      expect(check.blocker).toEqual({ date: 5, thing: "bush", type: "thing" });
      expect(
        check.blocker &&
          describeRefusal({ blocker: check.blocker, type: "tile" }, 5),
      ).toEqual({ icon: "🌿", text: "A bush is here" });
    });

    it("lets a building go on its tiles from the date of the cut, which is the next good day", () => {
      const cuts = [cutOn(12)];
      const request = {
        buildingId: "barn",
        currentItems: planWith(cuts),
        date: 5,
        farmMap,
        region: { x1: 20, x2: 20, y1: 37, y2: 37 },
      };

      expect(checkBuildingOrder(request).refusal).toEqual({
        blocker: { date: 5, thing: "bush", type: "thing" },
        type: "tile",
      });
      expect(findNextOrderDate(request)).toBe(12);
      expect(
        checkBuildingToPlace(barnOn(12), planWith(cuts), farmMap).fits,
      ).toBe(true);
    });

    it("blocks the tile below the door, because the player cannot walk through a bush (Bush.isPassable)", () => {
      // A barn at 20, 36 has the tile below its door at 21, 40.
      const barn: IPlannedBuilding = {
        buildingId: "barn",
        datePlaced: 5,
        x: 20,
        y: 36,
      };

      expect(checkBuildingToPlace(barn, planWith(), farmMap)).toMatchObject({
        blockedTiles: [bushTile],
        blocker: { type: "door" },
        fits: false,
      });
      expect(
        checkBuildingToPlace(barn, planWith([cutOn(5)]), farmMap).fits,
      ).toBe(true);
    });
  });

  describe("crop areas and watered soil", () => {
    it("leaves its tiles out of the area of a scarecrow while it is there", () => {
      const scarecrow = equipment("scarecrow", "scarecrow", 0, {
        x: 21,
        y: 44,
      });
      const areaOn = (date: number) =>
        getScarecrowMap(byTile([scarecrow]), date, farmMap, [], [cutOn(10)]);

      expect(hasBushTiles(areaOn(9))).toEqual([false, false]);
      expect(hasBushTiles(areaOn(10))).toEqual([true, true]);
    });

    it("leaves its tiles out of the area of a Junimo hut while it is there", () => {
      const hut = toPlacedBuilding({ buildingId: "junimo_hut", x: 20, y: 42 });
      const areaOn = (date: number) =>
        getJunimoAreaMap([hut], farmMap, date, [], [cutOn(10)]);

      expect(hasBushTiles(areaOn(9))).toEqual([false, false]);
      expect(hasBushTiles(areaOn(10))).toEqual([true, true]);
    });

    it("does not water its tiles while it is there", () => {
      const sprinkler = equipment("sprinkler", "iridium_sprinkler", 0, {
        x: 21,
        y: 42,
      });
      const soilOn = (date: number) =>
        getWateredSoilMap(byTile([sprinkler]), date, farmMap, [], [cutOn(10)]);

      expect(hasBushTiles(soilOn(9))).toEqual([false, false]);
      expect(hasBushTiles(soilOn(10))).toEqual([true, true]);
    });
  });
});
