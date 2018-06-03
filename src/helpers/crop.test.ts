import { getCropsLastDay } from "./crop";

interface ITheory {
  expected: number;
  values: {
    dayPlanted: number;
    regrow?: number;
    seasons: string[];
    stages: number[];
  };
}

describe("Crop helper", () => {
  const baseCrop = {
    buy: 0,
    harvest: {},
    id: "test_crop",
    index: 481,
    name: "Test Crop",
    sell: 0
  };

  const twoSeasons = {
    seasons: ["spring", "summer"]
  };

  const oneDayGrowth = {
    stages: [1]
  };

  const tenDayGrowth = {
    stages: [1, 3, 2, 5]
  };

  describe("can get the last day a crop will survive when it", () => {
    const theories: ITheory[] = [
      {
        expected: 10,
        values: { ...tenDayGrowth, ...twoSeasons, dayPlanted: 0 }
      },
      {
        expected: 37,
        values: { ...tenDayGrowth, ...twoSeasons, dayPlanted: 27 }
      },
      {
        expected: 38,
        values: { ...tenDayGrowth, ...twoSeasons, dayPlanted: 28 }
      },
      {
        expected: 55,
        values: { ...tenDayGrowth, ...twoSeasons, dayPlanted: 55 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, dayPlanted: 0, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, dayPlanted: 27, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, dayPlanted: 28, regrow: 1 }
      },
      {
        expected: 55,
        values: { ...oneDayGrowth, ...twoSeasons, dayPlanted: 55, regrow: 1 }
      }
    ];

    theories.map((theory: { values: any; expected: number }) => {
      const crop: ICrop = {
        ...baseCrop,
        regrow: theory.values.regrow,
        seasons: theory.values.seasons,
        stages: theory.values.stages
      };

      const { dayPlanted, regrow } = theory.values;
      const daysToGrow = theory.values.stages.reduce(
        (acc: number, val: number) => acc + val
      );

      it(`is planted on day ${dayPlanted}, takes ${daysToGrow} day${
        daysToGrow > 1 ? "s" : ""
      } to grow, ${
        theory.values.regrow
          ? `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
          : "doesn't regrow"
      }, and can grow during ${theory.values.seasons.join(" and ")}`, () => {
        expect(getCropsLastDay(crop, theory.values.dayPlanted)).toBe(
          theory.expected
        );
      });
    });
  });
});
