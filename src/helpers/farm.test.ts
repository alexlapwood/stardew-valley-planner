import { forEachTile, getCropsAtLocation } from "./farm";

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

  describe("getCropsAtLocation", () => {
    it("gets the crops on the farm at the given location", () => {
      const currentCrops = {
        5: {
          5: [
            {
              cropId: "parsnip",
              datePlanted: 0,
              x: 5,
              y: 5
            },
            {
              cropId: "parsnip",
              datePlanted: 10,
              x: 5,
              y: 5
            }
          ]
        }
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
});
