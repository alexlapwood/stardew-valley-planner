import { getSeason, getYear } from "./date";

import merge from "../helpers/merge";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../data/sdv.json").crops;

const seasons = ["spring", "summer", "fall", "winter"];

export function getCropsLastDay(
  plantedCrop: IPlantedCrop,
  plantedCropDetails: ICrop
) {
  if (plantedCrop.dateDestroyed !== undefined) {
    return plantedCrop.dateDestroyed - 1;
  }
  const seasonPlanted = getSeason(plantedCrop.datePlanted);

  const daysInASeason = 28;
  const daysInAYear = daysInASeason * 4;

  for (let i = 0; i < 4; i += 1) {
    if (
      !plantedCropDetails.seasons.find(
        season => seasons[(seasonPlanted + i) % 4] === season
      )
    ) {
      const lastDay =
        getYear(plantedCrop.datePlanted) * daysInAYear +
        (getSeason(plantedCrop.datePlanted) + i) * daysInASeason -
        1;

      if (plantedCropDetails.regrow) {
        return lastDay;
      }

      return Math.min(
        lastDay,
        plantedCrop.datePlanted +
          plantedCropDetails.stages.reduce((acc, val) => {
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

export function checkCropsToPlant(
  cropsToPlant: IPlantedCrop[],
  currentCrops: IFarmCrops
) {
  return cropsToPlant.reduce(
    (acc, cropToPlant) => {
      const plantedCrops = getCropsAtLocation(
        currentCrops,
        cropToPlant.x,
        cropToPlant.y
      );

      const plantedCropConflict = plantedCrops.find(plantedCrop => {
        const plantedCropDetails = crops.find(
          ({ id }) => id === plantedCrop.cropId
        ) as ICrop;

        const cropToPlantsDetails = crops.find(
          ({ id }) => id === cropToPlant.cropId
        ) as ICrop;

        const plantedCropsLastDay = getCropsLastDay(
          plantedCrop,
          plantedCropDetails
        );

        const cropToPlantsLastDay = getCropsLastDay(
          cropToPlant,
          cropToPlantsDetails
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
        return merge(acc, {
          plantableCrops: [cropToPlant]
        });
      }

      return merge(acc, {
        unplantableCrops: [cropToPlant]
      });
    },
    { plantableCrops: [], unplantableCrops: [] }
  ) as {
    plantableCrops: IPlantedCrop[];
    unplantableCrops: IPlantedCrop[];
  };
}

export function findCropToDestroy(
  plantedCrops: IPlantedCrop[],
  dateToDestroyOn: number
) {
  return plantedCrops.find(plantedCrop => {
    const plantedCropDetails = crops.find(
      ({ id }) => id === plantedCrop.cropId
    ) as ICrop;

    const plantedCropsLastDay = getCropsLastDay(
      plantedCrop,
      plantedCropDetails
    );

    if (
      (plantedCrop.dateDestroyed === undefined ||
        dateToDestroyOn < plantedCrop.dateDestroyed) &&
      dateToDestroyOn >= plantedCrop.datePlanted &&
      (plantedCropsLastDay === undefined ||
        dateToDestroyOn <= plantedCropsLastDay)
    ) {
      return true;
    }

    return false;
  });
}

function getCropsAtLocation(currentCrops: IFarmCrops, x: number, y: number) {
  if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
    return currentCrops[y][x];
  }

  return [] as IPlantedCrop[];
}
