import type { IFixedErase } from "../../helpers/fixedBuildingErase";
import type { ICurrentItems } from "../../helpers/itemPlacement";
import { planRegionErase } from "../../helpers/regionErase";
import {
  greenhouseRepair,
  houseColorPaints,
  houseUpgrades,
  setBuildings,
  setCrops,
  setCutBushes,
  setEquipment,
  setGreenhouseRepair,
  setHouseColorPaints,
  setHouseUpgrades,
} from "../../state/farm";
import type { IRegion } from "./Farm.region";

interface IEraseState {
  date: number;
  farmMap: IFarmMap;
}

function eraseFixedBuildings({
  greenhouseRepair: repair,
  houseColorPaints: colorPaints,
  houseUpgrades: upgrades,
}: IFixedErase) {
  if (upgrades !== houseUpgrades()) {
    setHouseUpgrades(upgrades);
  }

  if (colorPaints !== houseColorPaints()) {
    setHouseColorPaints(colorPaints);
  }

  if (repair !== greenhouseRepair()) {
    setGreenhouseRepair(repair);
  }
}

export function eraseRegion(
  highlightedRegion: IRegion,
  { date, farmMap }: IEraseState,
  currentItems: ICurrentItems,
) {
  const erase = planRegionErase(currentItems, farmMap, highlightedRegion, date);

  setCrops(erase.crops);
  setEquipment(erase.equipment);
  setBuildings(erase.buildings);
  eraseFixedBuildings(erase.fixed);

  if (erase.bushes.cutBushes !== currentItems.currentCutBushes) {
    setCutBushes(erase.bushes.cutBushes);
  }
}
