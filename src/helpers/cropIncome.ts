import {
  getGoldPrice,
  getPerDay,
  getPlanYearEnd,
  type IIncome,
} from "./income";

type TCropIncome = Pick<
  ICrop,
  "harvest" | "regrow" | "seasons" | "sell" | "stages"
>;

// A crop planted too late to ripen before its season ends gives 0 harvests,
// not a negative number that would take gold away.
function getHarvests(crop: TCropIncome, date: number, end: number) {
  const daysToGrow = crop.stages.reduce((acc, stage) => acc + stage, 0);

  return Math.max(
    0,
    Math.ceil((end - date - daysToGrow) / (crop.regrow ?? daysToGrow)),
  );
}

export function getCropIncome(crop: TCropIncome, date: number): IIncome {
  const end = getPlanYearEnd(crop.seasons, date);
  const total = crop.sell * getHarvests(crop, date, end) * crop.harvest.min;

  return { perDay: getPerDay(total, date, end), total };
}

export function getCropProfit(
  crop: TCropIncome & Pick<ICrop, "seedPrices">,
  date: number,
): IIncome | undefined {
  const seedPrice = getGoldPrice(crop.seedPrices);

  if (seedPrice === undefined) {
    return undefined;
  }

  const end = getPlanYearEnd(crop.seasons, date);
  const harvests = getHarvests(crop, date, end);
  const seeds = crop.regrow === undefined ? harvests : 1;
  const total = crop.sell * harvests * crop.harvest.min - seedPrice * seeds;

  return { perDay: getPerDay(total, date, end), total };
}
