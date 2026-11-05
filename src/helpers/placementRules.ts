import { getPlacementFlags } from "./buildingTileRules";
import { isOnMap } from "./farmMap";
import { getItemSkin, isFloorItem } from "./items";

type TPlacedEquipment = Pick<IInstalledEquipment, "equipmentId" | "skin">;

function getTileFlags(map: IFarmMap, x: number, y: number) {
  return isOnMap(map, x, y)
    ? getPlacementFlags(map)[y * map.width + x]
    : undefined;
}

function hasFlags(flags: number, wanted: number) {
  return (flags & wanted) === wanted;
}

function isSprinkler({ equipmentId, skin }: TPlacedEquipment) {
  return getItemSkin(equipmentId, skin)?.waterRange !== undefined;
}

// The game plants a seed like a floor, as an item that the player can walk
// over, so a tile that stops solid items can still take a seed.
export function canPlantAt(map: IFarmMap, x: number, y: number) {
  const flags = getTileFlags(map, x, y);
  const { floorable, tillable } = map.ruleFlags;

  return flags !== undefined && hasFlags(flags, tillable | floorable);
}

export function canWaterAt(map: IFarmMap, x: number, y: number) {
  const flags = getTileFlags(map, x, y);

  return (
    flags !== undefined &&
    canPlantAt(map, x, y) &&
    !hasFlags(flags, map.ruleFlags.noSprinklers)
  );
}

export function canInstallAt(
  map: IFarmMap,
  equipment: TPlacedEquipment,
  x: number,
  y: number,
) {
  const flags = getTileFlags(map, x, y);

  if (flags === undefined) {
    return false;
  }

  const { blocked, floorable, noSprinklers } = map.ruleFlags;

  if (isFloorItem(equipment.equipmentId)) {
    return hasFlags(flags, floorable);
  }

  if (hasFlags(flags, blocked)) {
    return false;
  }

  return !isSprinkler(equipment) || !hasFlags(flags, noSprinklers);
}
