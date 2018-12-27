import { calculateStageOfCrop, getCropsLastDay } from "./crop";

describe("Crop helper", () => {
  const baseCrop = {
    buy: 0,
    harvest: {},
    id: "test_crop",
    name: "Test Crop",
    sell: 0
  };

  const twoSeasons = {
    seasons: ["spring", "summer"]
  };

  const oneDayGrowth = {
    stages: [1]
  };

  const greenBeanGrowth = {
    stages: [1, 1, 1, 3, 4]
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
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 0 }
      },
      {
        expected: 36,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 27 }
      },
      {
        expected: 37,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 28 }
      },
      {
        expected: 55,
        values: { ...greenBeanGrowth, ...twoSeasons, datePlanted: 55 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 0, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 27, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 28, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, datePlanted: 55, regrow: 1 }
      }
    ];

    theories.map(theory => {
      const crop: ICrop = {
        ...baseCrop,
        regrow: theory.values.regrow,
        seasons: theory.values.seasons,
        stages: theory.values.stages
      };

      const { datePlanted, regrow, stages } = theory.values;
      const daysToGrow = stages.reduce((acc: number, val: number) => acc + val);

      it(`is planted on day ${datePlanted}, takes ${daysToGrow} day${
        daysToGrow > 1 ? "s" : ""
      } to grow, ${
        regrow
          ? `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
          : "doesn't regrow"
      }, and can grow during ${theory.values.seasons.join(" and ")}`, () => {
        expect(
          getCropsLastDay(
            {
              cropId: "test",
              datePlanted: theory.values.datePlanted,
              type: "crop",
              x: 0,
              y: 0
            },
            crop
          )
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
        values: { ...greenBeanGrowth, dayChecked: 0, dayPlanted: 0 }
      },
      {
        expected: 1,
        values: { ...greenBeanGrowth, dayChecked: 1, dayPlanted: 0 }
      },
      {
        expected: 2,
        values: { ...greenBeanGrowth, dayChecked: 2, dayPlanted: 0 }
      },
      {
        expected: 3,
        values: { ...greenBeanGrowth, dayChecked: 3, dayPlanted: 0 }
      },
      {
        expected: 3,
        values: { ...greenBeanGrowth, dayChecked: 5, dayPlanted: 0 }
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 6, dayPlanted: 0 }
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 9, dayPlanted: 0 }
      },
      {
        expected: 5,
        values: { ...greenBeanGrowth, dayChecked: 10, dayPlanted: 0 }
      },
      {
        expected: 0,
        values: { ...greenBeanGrowth, dayChecked: 0, dayPlanted: 0, regrow: 3 }
      },
      {
        expected: 1,
        values: { ...greenBeanGrowth, dayChecked: 1, dayPlanted: 0, regrow: 3 }
      },
      {
        expected: 5,
        values: { ...greenBeanGrowth, dayChecked: 10, dayPlanted: 0, regrow: 3 }
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 11, dayPlanted: 0, regrow: 3 }
      },
      {
        expected: 4,
        values: { ...greenBeanGrowth, dayChecked: 12, dayPlanted: 0, regrow: 3 }
      },
      {
        expected: 5,
        values: { ...greenBeanGrowth, dayChecked: 13, dayPlanted: 0, regrow: 3 }
      }
    ];

    theories.map(theory => {
      const { dayChecked, dayPlanted, regrow, stages } = theory.values;

      it(`is planted on day ${dayPlanted}, takes ${stages.join(
        " + "
      )} days to mature, ${
        regrow
          ? `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
          : "doesn't regrow"
      }, and is checked on day ${dayChecked}`, () => {
        expect(
          calculateStageOfCrop(dayChecked - dayPlanted, stages, regrow)
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
          y: 0
        },
        {
          ...greenBeanGrowth,
          buy: 0,
          harvest: {},
          id: "test_crop",
          name: "Test Crop",
          seasons: ["spring", "summer", "fall", "winter"],
          sell: 0
        }
      );

      expect(result).toBe(4 * 28 + 4);
    });

    it("throws an error if a crop will never die", () => {
      expect(() => {
        getCropsLastDay(
          {
            cropId: "test",
            datePlanted: 0,
            type: "crop",
            x: 0,
            y: 0
          },
          {
            ...oneDayGrowth,
            buy: 0,
            harvest: {},
            id: "test_crop",
            name: "Test Crop",
            regrow: 1,
            seasons: ["spring", "summer", "fall", "winter"],
            sell: 0
          }
        );
      }).toThrowError("This crop will regrow indefinitely");
    });
  });
});
