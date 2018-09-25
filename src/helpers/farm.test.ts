import {
  forEachFarmItem,
  forEachTile,
  getCropsAtLocation,
  getSoilMap
} from "./farm";
import merge from "./merge";

describe("Farm helper", () => {
  describe("forEachTile", () => {
    it("will call a function for each tile in a highlighted range", () => {
      const theories = [
        { expected: 1, highlightedRegion: { x1: 0, x2: 0, y1: 0, y2: 0 } },
        { expected: 10, highlightedRegion: { x1: 0, x2: 4, y1: 0, y2: 1 } },
        { expected: 10, highlightedRegion: { x1: 4, x2: 0, y1: 1, y2: 0 } },
        { expected: 10, highlightedRegion: { x1: 10, x2: 14, y1: 10, y2: 11 } }
      ];

      theories.forEach(theory => {
        const callBack = jest.fn();
        forEachTile(theory.highlightedRegion, callBack);
        expect(callBack).toHaveBeenCalledTimes(theory.expected);
      });
    });

    it("will call a function with the current tile", () => {
      const theories = [
        {
          expected: [[0, 0], [1, 0], [0, 1], [1, 1]],
          highlightedRegion: { x1: 0, x2: 1, y1: 0, y2: 1 }
        },
        {
          expected: [[0, 0], [1, 0], [0, 1], [1, 1]],
          highlightedRegion: { x1: 1, x2: 0, y1: 1, y2: 0 }
        },
        {
          expected: [[1, 1], [10, 1], [1, 10], [10, 10]],
          highlightedRegion: { x1: 1, x2: 10, y1: 1, y2: 10 }
        }
      ];

      theories.forEach(theory => {
        const callBack = jest.fn();
        forEachTile(theory.highlightedRegion, callBack);
        theory.expected.forEach(expected => {
          expect(callBack).toHaveBeenCalledWith(...expected);
        });
      });
    });

    it("doesn't crash when the coordinates are NaN", () => {
      const highlightedRegion = { x1: NaN, x2: NaN, y1: NaN, y2: NaN };
      const callBack = jest.fn();
      forEachTile(highlightedRegion, callBack);
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
        y
      };
      const equipment: IInstalledEquipment = {
        dateInstalled: 0,
        equipmentId: "test",
        type: "equipment",
        x,
        y
      };

      const mock = jest.fn();
      const currentCrops: IFarmCrops = {
        [y]: {
          [x]: [crop]
        }
      };
      const currentEquipment: IFarmEquipment = {
        [y]: {
          [x]: [equipment]
        }
      };

      let farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>> = {};

      farmItems = merge(farmItems, currentCrops);
      farmItems = merge(farmItems, currentEquipment);

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
              y: 5
            },
            {
              cropId: "parsnip",
              datePlanted: 10,
              type: "crop",
              x: 5,
              y: 5
            }
          ]
        }
      };

      const actual = getCropsAtLocation(currentCrops, 5, 5);

      expect(actual).toEqual(currentCrops[5][5]);
    });

    describe("getSoilMap", () => {
      it("creates a soil map from the current crops and equipment", () => {
        const currentCrops: IFarmCrops = {
          0: {
            0: [
              {
                cropId: "parsnip",
                datePlanted: 0,
                type: "crop",
                x: 0,
                y: 0
              }
            ]
          }
        };
        const currentEquipment: IFarmEquipment = {
          3: {
            3: [
              {
                dateInstalled: 0,
                equipmentId: "sprinkler",
                type: "equipment",
                x: 3,
                y: 3
              }
            ]
          }
        };

        const actual = getSoilMap(currentCrops, currentEquipment, 0);

        expect(actual).toMatchSnapshot();
      });
    });

    it("returns an empty array if no crops have been planted", () => {
      const currentCrops = {};

      const actual = getCropsAtLocation(currentCrops, 5, 5);

      expect(actual).toEqual([]);
    });
  });
});
