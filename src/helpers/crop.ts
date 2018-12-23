import { getSeason, getYear } from "./date";

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

  if (plantedCropDetails.regrow) {
    throw new Error("This crop will regrow indefinitely");
  }

  return (
    plantedCrop.datePlanted +
    plantedCropDetails.stages.reduce((acc, val) => {
      return acc + val;
    }) -
    1
  );
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
