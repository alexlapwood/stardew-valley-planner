import { getSeason, getYear } from "./date";

type TCropGrowth = Pick<ICrop, "regrow" | "seasons" | "stages">;

const seasons = ["spring", "summer", "fall", "winter"];

const goldSeedShops = [
  "SeedShop",
  "Joja",
  "Sandy",
  "Traveler",
  "Festival_EggFestival_Pierre",
];

export function getCropsLastDay(
  plantedCrop: IPlantedCrop,
  plantedCropDetails: TCropGrowth,
) {
  if (plantedCrop.dateDestroyed !== undefined) {
    return plantedCrop.dateDestroyed - 1;
  }
  const seasonPlanted = getSeason(plantedCrop.datePlanted);

  const daysInASeason = 28;
  const daysInAYear = daysInASeason * 4;

  // In the game a crop that regrows in every season never dies, but a plan
  // needs a finite end, so it ends the day before its planted season returns.
  let seasonsInARow = 0;

  while (
    seasonsInARow < seasons.length &&
    plantedCropDetails.seasons.includes(
      seasons[(seasonPlanted + seasonsInARow) % seasons.length],
    )
  ) {
    seasonsInARow += 1;
  }

  const lastDayInSeason =
    getYear(plantedCrop.datePlanted) * daysInAYear +
    (seasonPlanted + seasonsInARow) * daysInASeason -
    1;

  if (plantedCropDetails.regrow !== undefined) {
    return lastDayInSeason;
  }

  return Math.min(
    lastDayInSeason,
    plantedCrop.datePlanted +
      plantedCropDetails.stages.reduce((acc, val) => acc + val, 0) -
      1,
  );
}

// The old site also hid indoor-only seeds from this menu, but it still kept
// and drew their cells in a plan.
export function isInSeedMenu(crop: ICrop) {
  return !crop.indoorOnly;
}

export function calculateStageOfCrop(
  age: number,
  stages: number[],
  regrow?: number,
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

export function getCropSprites(
  crop: ICrop,
  age: number,
  x: number,
  y: number,
  season: string,
): TSpriteRect[] {
  const growth = crop.sprites.growthBySeason?.[season] ?? crop.sprites.growth;
  const stage = calculateStageOfCrop(age, crop.stages, crop.regrow);
  const daysToGrow = crop.stages.reduce((acc, val) => acc + val, 0);
  const isReady = stage === crop.stages.length;
  const lastGrowing = growth.growing.at(-1) ?? growth.ready;

  if (stage === 0) {
    return [growth.planted[(x * 7 + y * 11) % growth.planted.length]];
  }

  if (crop.regrow !== undefined && age > daysToGrow) {
    return isReady
      ? [growth.regrown ?? growth.ready]
      : [growth.regrowing ?? lastGrowing];
  }

  if (isReady) {
    return growth.readyOverlay === undefined
      ? [growth.ready]
      : [growth.ready, growth.readyOverlay];
  }

  return [growth.growing[stage - 1]];
}

export function getSeedCost(crop: ICrop) {
  for (const shop of goldSeedShops) {
    const offer = crop.seedPrices[shop];

    if (
      offer?.price !== undefined &&
      offer.random !== true &&
      offer.trade === undefined
    ) {
      return { cost: offer.price, label: `${offer.price}g` };
    }
  }

  const trade = Object.values(crop.seedPrices).find(
    (offer) => offer?.trade !== undefined,
  )?.trade;

  if (trade !== undefined) {
    return { cost: 0, label: `${trade.item} ×${trade.count}` };
  }

  return undefined;
}
