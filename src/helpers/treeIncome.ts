import { getPerDay, getPlanYearEnd, getShopCost, type IIncome } from "./income";
import { isTreeHarvestDay } from "./tree";

type TTreeIncome = Pick<ITree, "daysToMature" | "harvest" | "seasons" | "sell">;

export function getSaplingCost(tree: Pick<ITree, "saplingPrices">) {
  return getShopCost(tree.saplingPrices);
}

// The fruit is assumed to be picked every day, so a fruit tree never fills up
// to its maxFruit and gives 1 fruit a day.
export function getTreeIncome(tree: TTreeIncome, date: number): IIncome {
  const end = getPlanYearEnd(tree.seasons, date);
  const firstDay = date + tree.daysToMature;
  const harvests = Array.from(
    { length: Math.max(0, end - firstDay) },
    (_, index) => firstDay + index,
  ).filter((day) => isTreeHarvestDay(tree, day)).length;
  const total = harvests * tree.sell;

  return { perDay: getPerDay(total, date, end), total };
}
