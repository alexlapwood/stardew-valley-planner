import { buildings } from "../data/game/buildings.json";
import { getPaintable } from "./buildingColors";
import { defaultFarmLooks } from "./defaultBuildings";

export const farmhouseId = "farmhouse";

export interface IHouseLevel extends IHouseUpgrade {
  level: number;
}

export const houseLevels: readonly IHouseLevel[] = Object.entries(
  buildings[farmhouseId].houseUpgrades ?? {},
)
  .flatMap(([level, upgrade]) =>
    upgrade === undefined ? [] : [{ ...upgrade, level: Number(level) }],
  )
  .toSorted((a, b) => a.level - b.level);

export type THouseOrder =
  | { refusal: "built"; upgraded?: undefined }
  | { refusal?: undefined; upgraded: IPlannedHouseUpgrade[] };

export function findHouseLevel(level: number) {
  return houseLevels.find((houseLevel) => houseLevel.level === level);
}

export function getHouseLevelOn(
  upgrades: readonly IPlannedHouseUpgrade[],
  date: number,
) {
  return upgrades.findLast(({ datePlaced }) => datePlaced <= date)?.level ?? 0;
}

// The export has no upgrade for level 0, the house that the farm starts with.
export function getHouseLook(level: number) {
  return findHouseLevel(level)?.look ?? defaultFarmLooks.house;
}

export function getHouseLookOn(
  upgrades: readonly IPlannedHouseUpgrade[],
  date: number,
) {
  return getHouseLook(getHouseLevelOn(upgrades, date));
}

export function getHousePaintable(level: number) {
  return getPaintable({
    buildingId: farmhouseId,
    houseLevel: level,
    lookKey: getHouseLook(level),
  });
}

export function chainHouseUpgrades(
  fromLevel: number,
  toLevel: number,
  date: number,
) {
  return Array.from(
    { length: Math.max(toLevel - fromLevel, 0) },
    (_, index): IPlannedHouseUpgrade => ({
      datePlaced: date,
      level: fromLevel + index + 1,
    }),
  );
}

// A higher level on a lower house is each level up to it, all on the date,
// so that the plan keeps the cost of each level. It takes the place of the
// upgrades that were planned after the date.
export function orderHouseUpgrade(
  upgrades: readonly IPlannedHouseUpgrade[],
  level: number,
  date: number,
): THouseOrder {
  const currentLevel = getHouseLevelOn(upgrades, date);

  if (level <= currentLevel) {
    return { refusal: "built" };
  }

  return {
    upgraded: [
      ...upgrades.filter(({ datePlaced }) => datePlaced <= date),
      ...chainHouseUpgrades(currentLevel, level, date),
    ],
  };
}

// The game upgrades the house 1 level at a time (SV ›
// GameLocation.houseUpgradeAccept).
export function findBadHouseUpgrade(upgrades: readonly IPlannedHouseUpgrade[]) {
  let previousDate = Number.NEGATIVE_INFINITY;

  return upgrades.findIndex((upgrade, index) => {
    const isGood =
      upgrade.level === index + 1 &&
      findHouseLevel(upgrade.level) !== undefined &&
      upgrade.datePlaced >= previousDate;
    previousDate = upgrade.datePlaced;

    return !isGood;
  });
}

// The game cannot take an upgrade back, so an erase takes back only the
// upgrade on the date, with the later ones.
export function eraseHouseUpgradeOn(
  upgrades: readonly IPlannedHouseUpgrade[],
  date: number,
) {
  const index = upgrades.findIndex(({ datePlaced }) => datePlaced === date);

  return index === -1 ? upgrades : upgrades.slice(0, index);
}
