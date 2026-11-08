import { getColorsOn } from "./buildingColors";
import { getSkinOn } from "./buildingSkins";
import { buildingIdBySpot, defaultFarmLooks } from "./defaultBuildings";
import { isGreenhouseRepairedOn } from "./greenhouseRepair";
import {
  getHouseLevelOn,
  getHouseLook,
  getHousePaintable,
} from "./houseUpgrades";
import type { ICurrentItems } from "./itemPlacement";

type TFixedBuildingPlan = Pick<
  ICurrentItems,
  | "currentGreenhouseRepair"
  | "currentHouseColorPaints"
  | "currentHouseUpgrades"
  | "currentPetBowlPaints"
>;

// The paint of the house shows only on the days that the house can take
// paint, so a paint stays hidden while the plan has no Nursery before it.
function getHouseColorsOn(
  colorPaints: readonly IPlannedColorPaint[],
  level: number,
  date: number,
) {
  return getHousePaintable(level).block === undefined
    ? getColorsOn({ colorPaints }, date)
    : undefined;
}

export function getFarmLooksOn(
  {
    currentGreenhouseRepair,
    currentHouseColorPaints = [],
    currentHouseUpgrades = [],
    currentPetBowlPaints = [],
  }: TFixedBuildingPlan,
  date: number,
): IFarmLooks {
  const level = getHouseLevelOn(currentHouseUpgrades, date);
  const houseColors = getHouseColorsOn(currentHouseColorPaints, level, date);

  return {
    greenhouse: isGreenhouseRepairedOn(currentGreenhouseRepair, date)
      ? "repaired"
      : defaultFarmLooks.greenhouse,
    house: getHouseLook(level),
    ...(houseColors === undefined ? {} : { houseColors }),
    petBowl: getSkinOn(
      { buildingId: buildingIdBySpot.petBowl, paints: currentPetBowlPaints },
      date,
    ),
  };
}
