import { mergeDeep } from "immutable";

import { forEachTileInRegion } from "./farm";
import { checkEquipmentToInstall } from "./itemPlacement";
import { getDefaultSkin } from "./items";

export function equipmentForRegion(
  selectedItem: ISelectedItem,
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  date: number,
) {
  const equipmentToInstallList: IInstalledEquipment[] = [];
  const skin = selectedItem.skin ?? getDefaultSkin(selectedItem.id);

  forEachTileInRegion(highlightedRegion, (x, y) => {
    equipmentToInstallList.push({
      dateInstalled: date,
      equipmentId: selectedItem.id,
      skin,
      type: "equipment",
      x,
      y,
    });
  });

  return equipmentToInstallList;
}

export function installableEquipmentByTile(
  equipmentToInstallList: IInstalledEquipment[],
  currentItems: { currentCrops: IFarmCrops; currentEquipment: IFarmEquipment },
  farmLayout: string[],
) {
  const { installableEquipment } = checkEquipmentToInstall(
    equipmentToInstallList,
    currentItems,
    farmLayout,
  );

  let equipmentByTile: IFarmEquipment = {};

  installableEquipment.forEach((equipmentToInstall) => {
    equipmentByTile = mergeDeep(equipmentByTile, {
      [equipmentToInstall.y]: {
        [equipmentToInstall.x]: [equipmentToInstall],
      },
    });
  });

  return equipmentByTile;
}
