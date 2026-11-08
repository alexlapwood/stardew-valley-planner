import { getYear, seasonNames } from "./date";
import { getMaterialSprite } from "./materials";
import type { ITooltipLine } from "./tooltip";

export interface IIncome {
  perDay: number;
  total: number;
}

export interface IShopCost {
  cost: number;
  itemId?: string;
  label: string;
}

interface ITooltipValues {
  cost?: IShopCost;
  income: IIncome;
  profit?: IIncome;
  sell: number;
}

type TShopOffers = Partial<Record<string, IShopOffer>>;

const daysInASeason = 28;

const goldShops = [
  "SeedShop",
  "Joja",
  "Sandy",
  "Traveler",
  "Festival_EggFestival_Pierre",
];

export function getGoldPrice(offers: TShopOffers) {
  for (const shop of goldShops) {
    const offer = offers[shop];

    if (
      offer?.price !== undefined &&
      offer.random !== true &&
      offer.trade === undefined
    ) {
      return offer.price;
    }
  }

  return undefined;
}

export function getShopCost(offers: TShopOffers): IShopCost | undefined {
  const price = getGoldPrice(offers);

  if (price !== undefined) {
    return { cost: price, label: `${price}g` };
  }

  const trade = Object.values(offers).find(
    (offer) => offer?.trade !== undefined,
  )?.trade;

  if (trade !== undefined) {
    return {
      cost: 0,
      itemId: trade.itemId,
      label: `${trade.item} ×${trade.count}`,
    };
  }

  return undefined;
}

export function getPlanYearEnd(seasons: readonly string[], date: number) {
  const lastSeason = seasonNames.findLastIndex((season) =>
    seasons.includes(season),
  );

  return (getYear(date) * seasonNames.length + lastSeason + 1) * daysInASeason;
}

// A tree can be planted after its last season in the plan year, which leaves
// no days to share the gold over.
export function getPerDay(total: number, date: number, end: number) {
  const days = end - date;

  return days > 0 ? Math.round((total / days) * 100) / 100 : 0;
}

const formatCost = ({ itemId, label }: IShopCost): ITooltipLine => ({
  sprite: itemId === undefined ? undefined : getMaterialSprite(itemId),
  text: `Cost: ${label}`,
});

export function getIncomeTooltip(values: ITooltipValues): ITooltipLine[] {
  return [
    ...(values.cost === undefined ? [] : [formatCost(values.cost)]),
    ...[
      `Sell: ${values.sell}g`,
      `Income: ${values.income.total}g`,
      `Income/day: ${values.income.perDay}g`,
      ...(values.profit === undefined
        ? []
        : [
            `Profit: ${values.profit.total}g`,
            `Profit/day: ${values.profit.perDay}g`,
          ]),
    ].map((text) => ({ text })),
  ];
}
