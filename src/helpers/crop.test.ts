import {
  calculateStageOfCrop,
  checkCropsToPlant,
  findCropToDestroy,
  getCropsLastDay
} from "./crop";

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

  const greenBeanGrowth = {
    stages: [1, 1, 1, 3, 4]
  };

  describe("can get the last day a crop will survive when it", () => {
    const theories: Array<{
      expected: number;
      values: {
        dayPlanted: number;
        regrow?: number;
        seasons: string[];
        stages: number[];
      };
    }> = [
      {
        expected: 9,
        values: { ...greenBeanGrowth, ...twoSeasons, dayPlanted: 0 }
      },
      {
        expected: 36,
        values: { ...greenBeanGrowth, ...twoSeasons, dayPlanted: 27 }
      },
      {
        expected: 37,
        values: { ...greenBeanGrowth, ...twoSeasons, dayPlanted: 28 }
      },
      {
        expected: 55,
        values: { ...greenBeanGrowth, ...twoSeasons, dayPlanted: 55 }
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

    theories.map(theory => {
      const crop: ICrop = {
        ...baseCrop,
        regrow: theory.values.regrow,
        seasons: theory.values.seasons,
        stages: theory.values.stages
      };

      const { dayPlanted, regrow, stages } = theory.values;
      const daysToGrow = stages.reduce((acc: number, val: number) => acc + val);

      it(`is planted on day ${dayPlanted}, takes ${daysToGrow} day${
        daysToGrow > 1 ? "s" : ""
      } to grow, ${
        regrow
          ? `will regrow every ${regrow} day${regrow > 1 ? "s" : ""}`
          : "doesn't regrow"
      }, and can grow during ${theory.values.seasons.join(" and ")}`, () => {
        expect(getCropsLastDay(crop, theory.values.dayPlanted)).toBe(
          theory.expected
        );
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

  describe("checkCropsToPlant", () => {
    it("can detect overlapping crops", () => {
      const cropsToPlant: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 0, x: 1, y: 0 },
        { cropId: "parsnip", datePlanted: 0, x: 2, y: 0 }
      ];

      const currentCrops: IFarmCrops = {
        0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
      };
      const { plantableCrops, unplantableCrops } = checkCropsToPlant(
        cropsToPlant,
        currentCrops
      );

      expect(plantableCrops).toHaveLength(2);
      expect(unplantableCrops).toHaveLength(1);
    });

    it("can detect crops that are still growing here", () => {
      const cropsToPlant: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 3, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 4, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }
      ];

      const currentCrops: IFarmCrops = {
        0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
      };
      const { plantableCrops, unplantableCrops } = checkCropsToPlant(
        cropsToPlant,
        currentCrops
      );

      expect(plantableCrops).toHaveLength(2);
      expect(unplantableCrops).toHaveLength(4);
    });

    it("can detect crops that were planted after today", () => {
      const cropsToPlant: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 3, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 4, x: 0, y: 0 },
        { cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }
      ];

      const currentCrops: IFarmCrops = {
        0: { 0: [{ cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }] }
      };
      const { plantableCrops, unplantableCrops } = checkCropsToPlant(
        cropsToPlant,
        currentCrops
      );

      expect(plantableCrops).toHaveLength(2);
      expect(unplantableCrops).toHaveLength(4);
    });
  });

  describe("findCropToDestroy", () => {
    it("can find crops planted today", () => {
      const currentCrops: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
      ];
      const hasCropToDestroy = findCropToDestroy(currentCrops, 0);

      expect(hasCropToDestroy).toBeTruthy();
    });

    it("can find crops after on their last day", () => {
      const currentCrops: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
      ];
      const hasCropToDestroy = findCropToDestroy(currentCrops, 3);

      expect(hasCropToDestroy).toBeTruthy();
    });

    it("does not include crops that haven't been planted yet", () => {
      const currentCrops: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 }
      ];
      const hasCropToDestroy = findCropToDestroy(currentCrops, 0);

      expect(hasCropToDestroy).toBeFalsy();
    });

    it("does not include crops that have died", () => {
      const currentCrops: IPlantedCrop[] = [
        { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
      ];
      const hasCropToDestroy = findCropToDestroy(currentCrops, 4);

      expect(hasCropToDestroy).toBeFalsy();
    });
  });
});
