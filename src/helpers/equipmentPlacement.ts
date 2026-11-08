import { mergeDeep } from "immutable";

import { forEachTileInRegion } from "./farm";
import { isRandomFloor, type TPickFloorVariant } from "./floorVariant";
import { checkEquipmentToInstall, type ICurrentItems } from "./itemPlacement";
import { getDefaultSkin } from "./items";

export function equipmentForRegion(
  selectedItem: ISelectedItem,
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  date: number,
  pickFloorVariant?: TPickFloorVariant,
) {
  const equipmentToInstallList: IInstalledEquipment[] = [];
  const skin = selectedItem.skin ?? getDefaultSkin(selectedItem.id);
  const pickVariant = isRandomFloor(selectedItem.id, skin)
    ? pickFloorVariant
    : undefined;

  forEachTileInRegion(highlightedRegion, (x, y) => {
    const equipmentToInstall: IInstalledEquipment = {
      dateInstalled: date,
      equipmentId: selectedItem.id,
      skin,
      type: "equipment",
      x,
      y,
    };

    if (pickVariant !== undefined) {
      equipmentToInstall.variant = pickVariant(x, y);
    }

    equipmentToInstallList.push(equipmentToInstall);
  });

  return equipmentToInstallList;
}

export function installableEquipmentByTile(
  equipmentToInstallList: IInstalledEquipment[],
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
) {
  const { installableEquipment } = checkEquipmentToInstall(
    equipmentToInstallList,
    currentItems,
    farmMap,
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
