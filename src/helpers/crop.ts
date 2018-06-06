import * as deepExtend from "deep-extend";

import { getSeason, getYear } from "./date";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../data/sdv.json").crops;

// tslint:disable-next-line:no-var-requires
const cropMap: string[] = require("../data/crops.json");

const seasons = ["spring", "summer", "fall", "winter"];

export function getCropsLastDay(crop: ICrop, datePlanted: number) {
  const seasonPlanted = getSeason(datePlanted);

  const daysInASeason = 28;
  const daysInAYear = daysInASeason * 4;

  for (let i = 0; i < 4; i += 1) {
    if (
      !crop.seasons.find(season => seasons[(seasonPlanted + i) % 4] === season)
    ) {
      const lastDay =
        getYear(datePlanted) * daysInAYear +
        (getSeason(datePlanted) + i) * daysInASeason -
        1;

      if (crop.regrow) {
        return lastDay;
      }

      return Math.min(
        lastDay,
        datePlanted +
          crop.stages.reduce((acc, val) => {
            return acc + val;
          }) -
          1
      );
    }
  }

  return;
}

export function calculateStageOfCrop(
  age: number,
  stages: number[],
  regrow?: number
) {
  let stage = 0;
  let simulatedDay = 0;

  while (simulatedDay + stages[stage] <= age && stage < stages.length) {
    simulatedDay += stages[stage];
    stage += 1;
  }

  if (stage === stages.length && regrow !== undefined) {
    const daysSinceLastHarvest = (age - simulatedDay) % regrow;
    return daysSinceLastHarvest === 0 ? stage : stage - 1;
  }

  return stage;
}

export function renderCrop(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
  spriteIndex: number,
  x: number,
  y: number,
  name: string,
  isFlower?: boolean
) {
  context.drawImage(
    sprite,
    spriteIndex * 16,
    cropMap.indexOf(name) * 32,
    16,
    32,
    x * 16,
    (y - 1) * 16,
    16,
    32
  );

  if (isFlower) {
    context.drawImage(
      sprite,
      (spriteIndex + 1) * 16,
      cropMap.indexOf(name) * 32,
      16,
      32,
      x * 16,
      (y - 1) * 16,
      16,
      32
    );
  }
}

export function checkCropsToPlant(
  cropsToPlant: IPlantedCrop[],
  currentCrops: IFarmCrops
) {
  return cropsToPlant.reduce(
    (acc, cropToPlant) => {
      let plantedCrops: IPlantedCrop[] = [];

      if (
        currentCrops[cropToPlant.y] !== undefined &&
        currentCrops[cropToPlant.y][cropToPlant.x] !== undefined
      ) {
        plantedCrops = currentCrops[cropToPlant.y][cropToPlant.x];
      }

      const plantedCropConflict = plantedCrops.find(plantedCrop => {
        const plantedCropDetails = crops.find(
          ({ id }) => id === plantedCrop.cropId
        );

        if (plantedCropDetails === undefined) {
          return false;
        }

        const plantedCropsLastDay = getCropsLastDay(
          plantedCropDetails,
          plantedCrop.datePlanted
        );

        const cropToPlantsLastDay = getCropsLastDay(
          plantedCropDetails,
          cropToPlant.datePlanted
        );

        const cropConflictWhilePlanting =
          cropToPlant.datePlanted >= plantedCrop.datePlanted &&
          (plantedCropsLastDay === undefined ||
            cropToPlant.datePlanted <= plantedCropsLastDay);

        const cropConflictDuringGrowth =
          cropToPlant.datePlanted < plantedCrop.datePlanted &&
          (cropToPlantsLastDay === undefined ||
            cropToPlantsLastDay >= plantedCrop.datePlanted);

        if (cropConflictWhilePlanting || cropConflictDuringGrowth) {
          return true;
        }

        return false;
      });

      if (plantedCropConflict === undefined) {
        return deepExtend(acc, {
          plantableCrops: [...acc.plantableCrops, cropToPlant]
        });
      }

      return deepExtend(acc, {
        unplantableCrops: [...acc.unplantableCrops, cropToPlant]
      });
    },
    { plantableCrops: [], unplantableCrops: [] }
  ) as {
    plantableCrops: IPlantedCrop[];
    unplantableCrops: IPlantedCrop[];
  };
}
