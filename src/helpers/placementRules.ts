import {
  getPlacementFlags,
  getTileFlagsOverDays,
  type ITileFlagsOverDays,
} from "./buildingTileRules";
import { findBushAt, findBushOver } from "./bushes";
import type { IDaySpan } from "./daySpan";
import {
  getDefaultBuildings,
  isOnDefaultBuilding,
  isSolidBuildingTile,
} from "./defaultBuildings";
import { flagsAt, isOnMap } from "./farmMap";
import { getItemSkin, isFloorItem } from "./items";
import {
  getPlacedBuildingsOver,
  isOnPlannedBuilding,
} from "./plannedBuildings";

const saplingTile = 1;

type TPlacedEquipment = Pick<IInstalledEquipment, "equipmentId" | "skin">;

// A thing stays on its tile for some days, and the planned buildings change
// the tiles from day to day, so a thing fits only a tile that takes it on each
// of its days. With no days, only the fixed buildings change the tiles, and no
// bush is cut.
export interface IPlacementDays extends IDaySpan {
  buildings: readonly IPlannedBuilding[];
  cutBushes?: readonly ICutBush[];
}

function getTileFlags(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
): ITileFlagsOverDays | undefined {
  if (!isOnMap(map, x, y)) {
    return undefined;
  }

  if (days === undefined) {
    const flags = getPlacementFlags(map)[y * map.width + x];

    return { onEveryDay: flags, onSomeDay: flags };
  }

  return getTileFlagsOverDays(map, days.buildings, { x, y }, days);
}

function hasFlags(flags: number, wanted: number) {
  return (flags & wanted) === wanted;
}

function isSprinkler({ equipmentId, skin }: TPlacedEquipment) {
  return getItemSkin(equipmentId, skin)?.waterRange !== undefined;
}

function isOnBuilding(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  return (
    isOnDefaultBuilding(map, x, y) ||
    (days !== undefined && isOnPlannedBuilding(days.buildings, x, y, days))
  );
}

// A bush is a terrain feature that the player cannot walk through, so the game
// does not hoe its tiles or put an item, a floor or a sapling on them
// (GameLocation.IsTileOccupiedBy, Bush.isPassable).
function isBushInTheWay(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  return days === undefined
    ? findBushAt(map, x, y) !== undefined
    : findBushOver(map, { x, y }, days, days.cutBushes) !== undefined;
}

// The game plants a seed like a floor, as an item that the player can walk
// over, so a tile that stops solid items can still take a seed.
export function canPlantAt(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  const flags = getTileFlags(map, x, y, days);
  const { floorable, tillable } = map.ruleFlags;

  return (
    flags !== undefined &&
    hasFlags(flags.onEveryDay, tillable | floorable) &&
    !isBushInTheWay(map, x, y, days)
  );
}

// The game puts a sapling down like a floor, and then checks the map tile
// properties that the export wrote to the sapling rows. The export reads the
// map with no buildings on it, and the game refuses a building tile. A floor
// can go on a blocked tile such as the mailbox, but a sapling cannot.
export function canPlantSaplingAt(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  const flags = getTileFlags(map, x, y, days);
  const { blocked, floorable } = map.ruleFlags;

  return (
    flags !== undefined &&
    hasFlags(flags.onEveryDay, floorable) &&
    !hasFlags(flags.onSomeDay, blocked) &&
    map.saplings[y * map.width + x] === saplingTile &&
    !isOnBuilding(map, x, y, days) &&
    !isBushInTheWay(map, x, y, days)
  );
}

export function canWaterAt(
  map: IFarmMap,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  const flags = getTileFlags(map, x, y, days);

  return (
    flags !== undefined &&
    canPlantAt(map, x, y, days) &&
    !hasFlags(flags.onSomeDay, map.ruleFlags.noSprinklers)
  );
}

export function canInstallAt(
  map: IFarmMap,
  equipment: TPlacedEquipment,
  x: number,
  y: number,
  days?: IPlacementDays,
) {
  const flags = getTileFlags(map, x, y, days);

  if (flags === undefined || isBushInTheWay(map, x, y, days)) {
    return false;
  }

  const { blocked, floorable, noSprinklers } = map.ruleFlags;

  if (isFloorItem(equipment.equipmentId)) {
    return hasFlags(flags.onEveryDay, floorable);
  }

  if (hasFlags(flags.onSomeDay, blocked)) {
    return false;
  }

  return !isSprinkler(equipment) || !hasFlags(flags.onSomeDay, noSprinklers);
}

export function canBuildAt(
  map: IFarmMap,
  x: number,
  y: number,
  days: IPlacementDays,
) {
  const flags = getTileFlags(map, x, y, days);

  return (
    flags !== undefined && hasFlags(flags.onEveryDay, map.ruleFlags.buildable)
  );
}

// A building stops the player only on the solid tiles of its collision map
// (Building.isTilePassable), not on all of its footprint, such as the open
// tile of the Pet Bowl.
function isOnSolidBuildingTile(
  map: IFarmMap,
  x: number,
  y: number,
  days: IPlacementDays,
) {
  return [
    ...getDefaultBuildings(map),
    ...getPlacedBuildingsOver(days.buildings, days),
  ].some((placedBuilding) => isSolidBuildingTile(placedBuilding, x, y));
}

// The flags have no walkable flag, and the blocked flag is no help, because
// NoFurniture stops solid items but not the player. The export reads the floor
// rule of the bare map with the game's passable check (isTilePassable), so a
// tile that takes a floor on the bare map is ground that the player can walk
// on.
export function canWalkAt(
  map: IFarmMap,
  x: number,
  y: number,
  days: IPlacementDays,
) {
  return (
    hasFlags(flagsAt(map, x, y), map.ruleFlags.floorable) &&
    !isOnSolidBuildingTile(map, x, y, days) &&
    !isBushInTheWay(map, x, y, days)
  );
}
