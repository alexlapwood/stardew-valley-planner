import { crops } from "../data/game/crops.json";
import {
  calculateStageOfCrop,
  getCropSprites,
  getCropsLastDay,
  getSeedCost,
  isInSeedMenu,
} from "./crop";

describe("Crop helper", () => {
  const twoSeasons = {
    seasons: ["spring", "summer"],
  };

  const oneDayGrowth = {
    stages: [1],
  };

  const greenBeanGrowth = {
    stages: [1, 1, 1, 3, 4],
  };

  describe("can get the last day a crop will survive when it", () => {
    const theories: Array<{
      expected: number;
      values: {
        datePlanted: number;
        regrow?: number;
        seasons: string[];
        stages: number[];
      };
    }> = [
      {
        expected: 9,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 0 },
      },
      {
        expected: 36,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 27 },
      },
      {
        expected: 37,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 28 },
      },
      {
        expected: 55,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 55 },
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 0, regrow: 1 },
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 27, regrow: 1 },
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 28, regrow: 1 },
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 55, regrow: 1 },
      },
    ];

    theories.map((theory) => {
      const crop = {
        regrow: theory.values.regrow,
        seasons: theory.values.seasons,
        stages: theory.values.stages,
      };

      const { datePlanted, regrow, stages } = theory.values;
      const daysToGrow = stages.reduce((acc: number, val: number) => acc + val);

      it(`is planted on day ${datePlanted}, takes ${daysToGrow} day${
        daysToGrow > 1 ? "s" : ""
      } to grow, ${
        regrow === undefined
          ? "doesn't regrow"
          : `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
      }, and can grow during ${theory.values.seasons.join(" and ")}`, () => {
        expect(
          getCropsLastDay(
            {
              cropId: "test",
              datePlanted: theory.values.datePlanted,
              type: "crop",
              x: 0,
              y: 0,
            },
            crop,
          ),
        ).toBe(theory.expected);
      });
    });
  });

  describe("can get the current stage of a crop when it", () => {
    const theories: Array<{
      expected: number;
      values: {
        dayChecked: number;
        dayPlanted: number;
        regrow?: number;
        stages: number[];
      };
    }> = [
      {
        expected: 0,
        values: { ...greenBeanGrowth, dayChecked: 0, dayPlanted: 0 },
      },
      {
        expected: 1,
        values: { ...greenBeanGrowth, dayChecked: 1, dayPlanted: 0 },
      },
      {
        expected: 2,
        values: { ...greenBeanGrowth, dayChecked: 2, dayPlanted: 0 },
      },
      {
        expected: 3,
        values: { ...greenBeanGrowth, dayChecked: 3, dayPlanted: 0 },
      },
      {
        expected: 3,
        values: { ...greenBeanGrowth, dayChecked: 5, dayPlanted: 0 },
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 6, dayPlanted: 0 },
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 9, dayPlanted: 0 },
      },
      {
        expected: 5,
        values: { ...greenBeanGrowth, dayChecked: 10, dayPlanted: 0 },
      },
      {
        expected: 0,
        values: { ...greenBeanGrowth, dayChecked: 0, dayPlanted: 0, regrow: 3 },
      },
      {
        expected: 1,
        values: { ...greenBeanGrowth, dayChecked: 1, dayPlanted: 0, regrow: 3 },
      },
      {
        expected: 5,
        values: {
          ...greenBeanGrowth,
          dayChecked: 10,
          dayPlanted: 0,
          regrow: 3,
        },
      },
      {
        expected: 4,
        values: {
          ...greenBeanGrowth,
          dayChecked: 11,
          dayPlanted: 0,
          regrow: 3,
        },
      },
      {
        expected: 4,
        values: {
          ...greenBeanGrowth,
          dayChecked: 12,
          dayPlanted: 0,
          regrow: 3,
        },
      },
      {
        expected: 5,
        values: {
          ...greenBeanGrowth,
          dayChecked: 13,
          dayPlanted: 0,
          regrow: 3,
        },
      },
    ];

    theories.map((theory) => {
      const { dayChecked, dayPlanted, regrow, stages } = theory.values;

      it(`is planted on day ${dayPlanted}, takes ${stages.join(
        " + ",
      )} days to mature, ${
        regrow === undefined
          ? "doesn't regrow"
          : `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
      }, and is checked on day ${dayChecked}`, () => {
        expect(
          calculateStageOfCrop(dayChecked - dayPlanted, stages, regrow),
        ).toBe(theory.expected);
      });
    });
  });

  describe("crops that can grow during any season", () => {
    it("calculates the last day based on the crop's stages", () => {
      const result = getCropsLastDay(
        {
          cropId: "test",
          datePlanted: 4 * 28 - 5,
          type: "crop",
          x: 0,
          y: 0,
        },
        {
          ...greenBeanGrowth,
          seasons: ["spring", "summer", "fall", "winter"],
        },
      );

      expect(result).toBe(4 * 28 + 4);
    });

    describe("ends a crop that regrows in every season on the day before its planted season comes back", () => {
      const theories = [
        { datePlanted: 0, expected: 4 * 28 - 1 },
        { datePlanted: 27, expected: 4 * 28 - 1 },
        { datePlanted: 4 * 28 - 5, expected: 7 * 28 - 1 },
        { datePlanted: 4 * 28 + 28 + 3, expected: 4 * 28 + 5 * 28 - 1 },
      ];

      theories.forEach(({ datePlanted, expected }) => {
        it(`when it is planted on day ${datePlanted}`, () => {
          expect(
            getCropsLastDay(
              { cropId: "test", datePlanted, type: "crop", x: 0, y: 0 },
              {
                ...greenBeanGrowth,
                regrow: 3,
                seasons: ["spring", "summer", "fall", "winter"],
              },
            ),
          ).toBe(expected);
        });
      });
    });

    it("ends a crop that regrows in every season on the day before it is destroyed", () => {
      expect(
        getCropsLastDay(
          {
            cropId: "test",
            dateDestroyed: 40,
            datePlanted: 0,
            type: "crop",
            x: 0,
            y: 0,
          },
          {
            ...oneDayGrowth,
            regrow: 1,
            seasons: ["spring", "summer", "fall", "winter"],
          },
        ),
      ).toBe(39);
    });
  });

  describe("isInSeedMenu", () => {
    it("shows a crop that can grow outdoors", () => {
      expect(isInSeedMenu({ ...crops.parsnip, indoorOnly: false })).toBe(true);
    });

    it("hides a crop that grows only indoors", () => {
      expect(isInSeedMenu({ ...crops.parsnip, indoorOnly: true })).toBe(false);
    });

    it("shows an outdoor crop that regrows in every season", () => {
      expect(
        isInSeedMenu({
          ...crops.parsnip,
          indoorOnly: false,
          regrow: 3,
          seasons: ["spring", "summer", "fall", "winter"],
        }),
      ).toBe(true);
    });
  });

  describe("getCropSprites", () => {
    const { growth } = crops.green_bean.sprites;
    const daysToGrow = crops.green_bean.stages.reduce((a, b) => a + b);
    const regrow = crops.green_bean.regrow ?? 0;

    it("shows one of the two planted sprites, picked by the tile", () => {
      expect(getCropSprites(crops.green_bean, 0, 0, 0, "summer")).toEqual([
        growth.planted[0],
      ]);
      expect(getCropSprites(crops.green_bean, 0, 1, 0, "summer")).toEqual([
        growth.planted[1],
      ]);
    });

    it("shows the growing sprite of each phase", () => {
      expect(getCropSprites(crops.green_bean, 1, 0, 0, "summer")).toEqual([
        growth.growing[0],
      ]);
      expect(
        getCropSprites(crops.green_bean, daysToGrow - 1, 0, 0, "summer"),
      ).toEqual([growth.growing.at(-1)]);
    });

    it("shows the ready sprite on the first harvest day", () => {
      expect(
        getCropSprites(crops.green_bean, daysToGrow, 0, 0, "summer"),
      ).toEqual([growth.ready]);
    });

    it("shows the regrowing and regrown sprites after a harvest", () => {
      expect(
        getCropSprites(crops.green_bean, daysToGrow + 1, 0, 0, "summer"),
      ).toEqual([growth.regrowing]);
      expect(
        getCropSprites(crops.green_bean, daysToGrow + regrow, 0, 0, "summer"),
      ).toEqual([growth.regrown]);
    });

    it("draws the flower overlay over the ready sprite", () => {
      const tulip = crops.tulip;
      const tulipDays = tulip.stages.reduce((a, b) => a + b);

      expect(getCropSprites(tulip, tulipDays, 0, 0, "spring")).toEqual([
        tulip.sprites.growth.ready,
        tulip.sprites.growth.readyOverlay,
      ]);
    });

    it("uses the sprites of the season when the crop has them", () => {
      expect(getCropSprites(crops.fiber, 0, 0, 0, "winter")).toEqual([
        crops.fiber.sprites.growthBySeason?.winter?.planted[0],
      ]);
      expect(getCropSprites(crops.fiber, 0, 0, 0, "spring")).toEqual([
        crops.fiber.sprites.growth.planted[0],
      ]);
    });
  });

  describe("getSeedCost", () => {
    const crop = crops.parsnip;

    it("uses the first gold price in shop order", () => {
      expect(
        getSeedCost({
          ...crop,
          seedPrices: { Joja: { price: 25 }, SeedShop: { price: 20 } },
        }),
      ).toEqual({ cost: 20, label: "20g" });
    });

    it("skips a random price", () => {
      expect(
        getSeedCost({
          ...crop,
          seedPrices: {
            Festival_EggFestival_Pierre: { price: 100 },
            Traveler: { random: true },
          },
        }),
      ).toEqual({ cost: 100, label: "100g" });
    });

    it("shows a trade and costs nothing when no shop sells it for gold", () => {
      expect(
        getSeedCost({
          ...crop,
          seedPrices: {
            Raccoon: { price: 0, trade: { count: 5, item: "Moss" } },
          },
        }),
      ).toEqual({ cost: 0, label: "Moss ×5" });
    });

    it("has no cost when no shop sells it", () => {
      expect(getSeedCost({ ...crop, seedPrices: {} })).toBeUndefined();
    });
  });
});
