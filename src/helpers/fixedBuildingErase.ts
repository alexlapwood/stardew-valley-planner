import { findBuildingsToErase, touchesRegion } from "./buildingErase";
import type { IDragRegion } from "./dragPlacement";
import { eraseRepairOn } from "./greenhouseRepair";
import { eraseHouseUpgradeOn, farmhouseId } from "./houseUpgrades";
import type { ICurrentItems } from "./itemPlacement";
import { getFootprintTiles } from "./plannedBuildings";

// tiles are the footprints of the fixed buildings that the erase changes.
export interface IFixedErase {
  greenhouseRepair?: IPlannedRepair;
  houseUpgrades: readonly IPlannedHouseUpgrade[];
  tiles: IFarmTile[];
}

// buildings are the planned buildings that the erase changes.
export interface IFarmErase {
  buildings: IPlannedBuilding[];
  fixed: IFixedErase;
}

function getSpotTiles(buildingId: string, { x, y }: IFarmSpot) {
  return getFootprintTiles({ buildingId, x, y });
}

// The game cannot demolish the farmhouse or the greenhouse, so an erase only
// takes back a house upgrade on its date, or the greenhouse repair.
export function planFixedErase(
  { currentGreenhouseRepair, currentHouseUpgrades = [] }: ICurrentItems,
  { spots }: IFarmMap,
  region: IDragRegion,
  date: number,
): IFixedErase {
  const houseUpgrades = touchesRegion(spots.farmhouse, region)
    ? eraseHouseUpgradeOn(currentHouseUpgrades, date)
    : currentHouseUpgrades;
  const greenhouseRepair = touchesRegion(spots.greenhouse, region)
    ? eraseRepairOn(currentGreenhouseRepair, date)
    : currentGreenhouseRepair;

  return {
    greenhouseRepair,
    houseUpgrades,
    tiles: [
      ...(houseUpgrades === currentHouseUpgrades
        ? []
        : getSpotTiles(farmhouseId, spots.farmhouse)),
      ...(greenhouseRepair === currentGreenhouseRepair
        ? []
        : getSpotTiles("greenhouse", spots.greenhouse)),
    ],
  };
}

export function planFarmErase(
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  region: IDragRegion,
  date: number,
): IFarmErase {
  return {
    buildings: findBuildingsToErase(
      currentItems.currentBuildings ?? [],
      region,
      date,
    ),
    fixed: planFixedErase(currentItems, farmMap, region, date),
  };
}
