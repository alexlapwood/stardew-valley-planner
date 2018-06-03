import { getSeason, getYear } from "./date";

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
  let day = 0;

  while (age > day + stages[stage] && stages[stage] !== undefined) {
    day += stages[stage];
    stage += 1;
  }

  if (age > day + 1 && stages[stage] === undefined) {
    day += 1;
    stage += 1;
  }

  if (stage > stages.length) {
    if (regrow !== undefined) {
      const daysSinceLastHarvest = (age - day) % regrow;
      return daysSinceLastHarvest === 0 ? stage - 1 : stage;
    }

    throw new Error();
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
