import { mergeDeep } from "immutable";

import { testFarmMap } from "../__mocks__/testFarmMap";
import {
  forEachFarmItem,
  forEachTileInRegion,
  getCropsAtLocation,
  getFenceMap,
  getFlooringMap,
  getSoilMap,
  getWateredSoilMap,
  isCropHereToday,
} from "./farm";

function soilTiles(soilMap: (number | undefined)[][]) {
  return [...soilMap.keys()].flatMap((x) =>
    [...(soilMap[x] ?? []).keys()]
      .filter((y) => soilMap[x][y] === 0)
      .map((y) => [x, y]),
  );
}

describe("Farm helper", () => {
  describe("forEachTileInRegion", () => {
    it("will call a function for each tile in a highlighted range", () => {
      const theories = [
        { expected: 1, highlightedRegion: { x1: 0, x2: 0, y1: 0, y2: 0 } },
        { expected: 10, highlightedRegion: { x1: 0, x2: 4, y1: 0, y2: 1 } },
        { expected: 10, highlightedRegion: { x1: 4, x2: 0, y1: 1, y2: 0 } },
        { expected: 10, highlightedRegion: { x1: 10, x2: 14, y1: 10, y2: 11 } },
      ];

      theories.forEach((theory) => {
        const callBack = vitest.fn();
        forEachTileInRegion(theory.highlightedRegion, callBack);
        expect(callBack).toHaveBeenCalledTimes(theory.expected);
      });
    });

    it("will call a function with the current tile", () => {
      const theories = [
        {
          expected: [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ],
          highlightedRegion: { x1: 0, x2: 1, y1: 0, y2: 1 },
        },
        {
          expected: [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ],
          highlightedRegion: { x1: 1, x2: 0, y1: 1, y2: 0 },
        },
        {
          expected: [
            [1, 1],
            [10, 1],
            [1, 10],
            [10, 10],
          ],
          highlightedRegion: { x1: 1, x2: 10, y1: 1, y2: 10 },
        },
      ];

      theories.forEach((theory) => {
        const callBack = vitest.fn();
        forEachTileInRegion(theory.highlightedRegion, callBack);
        theory.expected.forEach((expected) => {
          expect(callBack).toHaveBeenCalledWith(...expected);
        });
      });
    });

    it("doesn't crash when the coordinates are NaN", () => {
      const highlightedRegion = { x1: NaN, x2: NaN, y1: NaN, y2: NaN };
      const callBack = vitest.fn();
      forEachTileInRegion(highlightedRegion, callBack);
      expect(callBack).not.toHaveBeenCalled();
    });
  });

  describe("forEachFarmItem", () => {
    it("calls a function for each farm item", () => {
      const x = 10;
      const y = 15;
      const crop: IPlantedCrop = {
        cropId: "test",
        datePlanted: 0,
        type: "crop",
        x,
        y,
      };
      const equipment: IInstalledEquipment = {
        dateInstalled: 0,
        equipmentId: "test",
        skin: "test",
        type: "equipment",
        x,
        y,
      };

      const mock = vitest.fn();
      const currentCrops: IFarmCrops = {
        [y]: {
          [x]: [crop],
        },
      };
      const currentEquipment: IFarmEquipment = {
        [y]: {
          [x]: [equipment],
        },
      };

      let farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>> = {};

      farmItems = mergeDeep(farmItems, currentCrops);
      farmItems = mergeDeep(farmItems, currentEquipment);

      forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, mock);

      expect(mock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCropsAtLocation", () => {
    it("gets the crops on the farm at the given location", () => {
      const currentCrops: IFarmCrops = {
        5: {
          5: [
            {
              cropId: "parsnip",
              datePlanted: 0,
              type: "crop",
              x: 5,
              y: 5,
            },
            {
              cropId: "parsnip",
              datePlanted: 10,
              type: "crop",
              x: 5,
              y: 5,
            },
          ],
        },
      };

      const actual = getCropsAtLocation(currentCrops, 5, 5);

      expect(actual).toEqual(currentCrops[5][5]);
    });

    it("returns an empty array if no crops have been planted", () => {
      const currentCrops = {};

      const actual = getCropsAtLocation(currentCrops, 5, 5);

      expect(actual).toEqual([]);
    });
  });

  describe("getSoilMap", () => {
    it("creates a soil map from the current farm items", () => {
      const currentCrops: IFarmCrops = {
        0: {
          0: [
            {
              cropId: "parsnip",
              datePlanted: 0,
              type: "crop",
              x: 0,
              y: 0,
            },
          ],
        },
      };
      const currentEquipment: IFarmEquipment = {
        3: {
          3: [
            {
              dateInstalled: 0,
              equipmentId: "sprinkler",
              skin: "sprinkler",
              type: "equipment",
              x: 3,
              y: 3,
            },
            {
              dateInstalled: 0,
              equipmentId: "sprinkler",
              skin: "quality_sprinkler",
              type: "equipment",
              x: 3,
              y: 3,
            },
            {
              dateInstalled: 0,
              equipmentId: "sprinkler",
              skin: "iridium_sprinkler",
              type: "equipment",
              x: 3,
              y: 3,
            },
          ],
        },
      };

      let farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>> = {};

      farmItems = mergeDeep(farmItems, currentCrops);
      farmItems = mergeDeep(farmItems, currentEquipment);

      const actual = getSoilMap(farmItems, 0, testFarmMap);

      expect(actual).toMatchSnapshot();
    });

    it("does not return soil under paths", () => {
      const currentEquipment: IFarmEquipment = {
        0: {
          0: [
            {
              dateInstalled: 0,
              equipmentId: "sprinkler",
              skin: "sprinkler",
              type: "equipment",
              x: 0,
              y: 0,
            },
            {
              dateInstalled: 0,
              equipmentId: "flooring",
              skin: "wood_floor",
              type: "equipment",
              x: 0,
              y: 0,
            },
          ],
        },
      };

      let farmItems: IFarmEquipment = {};

      farmItems = mergeDeep(farmItems, currentEquipment);

      const actual = getSoilMap(farmItems, 0, testFarmMap);

      expect(actual).toMatchSnapshot();
    });

    describe("under trees", () => {
      // The basic sprinkler waters the 4 tiles beside it: 5,4 4,5 6,5 and 5,6.
      const sprinkler: IInstalledEquipment = {
        dateInstalled: 0,
        equipmentId: "sprinkler",
        skin: "sprinkler",
        type: "equipment",
        x: 5,
        y: 5,
      };
      const apple: IPlantedTree = {
        dateDestroyed: 10,
        datePlanted: 0,
        treeId: "apple",
        type: "tree",
        x: 5,
        y: 4,
      };
      const teaBush: IPlantedTree = {
        datePlanted: 3,
        treeId: "tea_bush",
        type: "tree",
        x: 6,
        y: 5,
      };
      const parsnipUnderTeaBush: IPlantedCrop = {
        cropId: "parsnip",
        dateDestroyed: 3,
        datePlanted: 0,
        type: "crop",
        x: 6,
        y: 5,
      };
      const plantedItems: IFarmItems<TFarmItem[]> = {
        4: { 5: [apple] },
        5: { 6: [parsnipUnderTeaBush, teaBush] },
      };
      const farmItems = mergeDeep(plantedItems, { 5: { 5: [sprinkler] } });

      it.each([
        ["getSoilMap", getSoilMap],
        ["getWateredSoilMap", getWateredSoilMap],
      ])(
        "%s has no soil on a tree or tea bush tile on the days the tree is there",
        (_, getMap) => {
          expect(soilTiles(getMap(farmItems, 5, testFarmMap))).toEqual([
            [4, 5],
            [5, 6],
          ]);
          expect(soilTiles(getMap(farmItems, 2, testFarmMap))).toEqual([
            [4, 5],
            [5, 6],
            [6, 5],
          ]);
          expect(soilTiles(getMap(farmItems, 10, testFarmMap))).toEqual([
            [4, 5],
            [5, 4],
            [5, 6],
          ]);
        },
      );

      it("waters only the sprinkler range, not the crop tiles", () => {
        expect(
          soilTiles(
            getWateredSoilMap(
              { 0: { 0: [{ ...parsnipUnderTeaBush, x: 0, y: 0 }] } },
              1,
              testFarmMap,
            ),
          ),
        ).toEqual([]);
      });
    });
  });

  describe("getFenceMap", () => {
    it("creates a fence map from the current equipment", () => {
      const currentEquipment: IFarmEquipment = {
        3: {
          2: [
            {
              dateInstalled: 0,
              equipmentId: "fence",
              skin: "wood_fence",
              type: "equipment",
              x: 3,
              y: 2,
            },
          ],
          3: [
            {
              dateInstalled: 0,
              equipmentId: "fence",
              skin: "wood_fence",
              type: "equipment",
              x: 3,
              y: 3,
            },
          ],
        },
      };

      const actual = getFenceMap(currentEquipment, 0);

      expect(actual).toMatchSnapshot();
    });
  });

  describe("getFlooringMap", () => {
    it("creates a flooring map from the current equipment", () => {
      const currentEquipment: IFarmEquipment = {
        3: {
          2: [
            {
              dateInstalled: 0,
              equipmentId: "flooring",
              skin: "wood_floor",
              type: "equipment",
              x: 3,
              y: 2,
            },
          ],
          3: [
            {
              dateInstalled: 0,
              equipmentId: "flooring",
              skin: "wood_floor",
              type: "equipment",
              x: 3,
              y: 3,
            },
          ],
        },
      };

      const actual = getFlooringMap(currentEquipment, 0);

      expect(actual).toMatchSnapshot();
    });
  });

  describe("isCropHereToday", () => {
    it("detects crops that are here today", () => {
      const actual = isCropHereToday(
        {
          cropId: "parsnip",
          datePlanted: 0,
          type: "crop",
          x: 0,
          y: 0,
        },
        0,
      );

      expect(actual).toBe(true);
    });

    it("does not detect crops planted in the future", () => {
      const actual = isCropHereToday(
        {
          cropId: "parsnip",
          datePlanted: 1,
          type: "crop",
          x: 0,
          y: 0,
        },
        0,
      );

      expect(actual).toBe(false);
    });

    it("does not detect crops that have already been destroyed", () => {
      const actual = isCropHereToday(
        {
          cropId: "parsnip",
          dateDestroyed: 1,
          datePlanted: 0,
          type: "crop",
          x: 0,
          y: 0,
        },
        2,
      );

      expect(actual).toBe(false);
    });

    it("keeps a crop that regrows in every season until its planted season comes back", () => {
      const cactus: IPlantedCrop = {
        cropId: "cactus_fruit",
        datePlanted: 0,
        type: "crop",
        x: 0,
        y: 0,
      };

      expect(isCropHereToday(cactus, 3 * 28)).toBe(true);
      expect(isCropHereToday(cactus, 4 * 28 - 1)).toBe(true);
      expect(isCropHereToday(cactus, 4 * 28)).toBe(false);
    });
  });
});
