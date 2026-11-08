import { crops } from "../data/game/crops.json";
import { isOnDay } from "./daySpan";
import {
  getCropsAtLocation,
  getEquipmentAtLocation,
  getFarmItemDays,
} from "./farm";
import type { ICurrentItems } from "./itemPlacement";
import { getItemSkin } from "./items";
import { canBuildAt, canWalkAt, type IPlacementDays } from "./placementRules";
import {
  getBuildingData,
  getBuildingDays,
  getDoorTile,
  getFootprint,
  getFootprintTiles,
} from "./plannedBuildings";
import {
  findBushBlocker,
  findGroundBlocker,
  findInTheWayOn,
  findThingBlocker,
  isFloor,
  type TTileBlocker,
} from "./tileBlockers";

// blocker is the cause on the first blocked tile.
export interface IBuildingCheck {
  blockedTiles: IFarmTile[];
  blocker?: TTileBlocker;
  fits: boolean;
  freeTiles: IFarmTile[];
  removedFloors: IInstalledEquipment[];
}

const unchangedTile = ".";

// A floor stays under a building, unless the tile rules of the building take
// the floorable flag away from that tile, as under the Well.
function keepsFloorAt(building: IBuilding, dx: number, dy: number) {
  const { changes, radius, rows } = building.tileRules;
  const key = rows[dy + radius]?.[dx + radius] ?? unchangedTile;

  return key === unchangedTile || changes[key]?.floorable !== false;
}

function getFarmItemsAt(currentItems: ICurrentItems, { x, y }: IFarmTile) {
  return [
    ...getCropsAtLocation(currentItems.currentCrops, x, y),
    ...getEquipmentAtLocation(currentItems.currentEquipment, x, y),
  ];
}

// The game takes the floors off a tile where the building has no floor under
// it (GameLocation.buildStructure), but it does not let a floor go there later
// while the building stands.
function getRemovedFloors(
  farmItems: readonly TFarmItem[],
  datePlaced: number,
  keepsFloor: boolean,
) {
  return keepsFloor
    ? []
    : farmItems
        .filter(isFloor)
        .filter((floor) => isOnDay(getFarmItemDays(floor), datePlaced));
}

// The game needs only ground that the player can walk on below the door
// (GameLocation.buildStructure: isBuildable with onlyNeedsToBePassable, or
// isPath). The player walks over crops, but not over a crop on a trellis
// (HoeDirt.isPassable), a fruit tree or a tea bush (FruitTree, Bush). The
// export marks the items that the player walks over, such as floors and
// torches.
function letsPlayerPass(farmItem: TFarmItem) {
  if (farmItem.type === "crop") {
    return !crops[farmItem.cropId].trellis;
  }

  if (farmItem.type === "tree") {
    return false;
  }

  return getItemSkin(farmItem.equipmentId, farmItem.skin)?.passable === true;
}

// A building never blocks itself, so the check can run again for a building
// that is in the plan. The tile flags are cached for each list of buildings,
// so the list stays the same when the building is not in it.
function getOtherBuildings(
  { currentBuildings = [] }: ICurrentItems,
  plannedBuilding: IPlannedBuilding,
) {
  return currentBuildings.includes(plannedBuilding)
    ? currentBuildings.filter((other) => other !== plannedBuilding)
    : currentBuildings;
}

function canOpenDoorAt(
  doorTile: IFarmTile,
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  days: IPlacementDays,
) {
  return (
    canWalkAt(farmMap, doorTile.x, doorTile.y, days) &&
    findInTheWayOn(
      getFarmItemsAt(currentItems, doorTile),
      days,
      (farmItem) => !letsPlayerPass(farmItem),
    ) === undefined
  );
}

// The game checks the tiles on the order day only, but a plan also has the
// later days, and a building stays on its tiles until it is demolished.
export function checkBuildingToPlace(
  plannedBuilding: IPlannedBuilding,
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
): IBuildingCheck {
  const building = getBuildingData(plannedBuilding);
  const footprint = getFootprint(plannedBuilding);
  const buildingDays = getBuildingDays(plannedBuilding);
  const days: IPlacementDays = {
    ...buildingDays,
    buildings: getOtherBuildings(currentItems, plannedBuilding),
    cutBushes: currentItems.currentCutBushes,
  };
  const freeTiles: IFarmTile[] = [];
  const blockedTiles: IFarmTile[] = [];
  const removedFloors: IInstalledEquipment[] = [];
  const blockers: TTileBlocker[] = [];

  getFootprintTiles(plannedBuilding).forEach((tile) => {
    const farmItems = getFarmItemsAt(currentItems, tile);
    const keepsFloor = keepsFloorAt(
      building,
      tile.x - footprint.x,
      tile.y - footprint.y,
    );
    const floorsToRemove = getRemovedFloors(
      farmItems,
      plannedBuilding.datePlaced,
      keepsFloor,
    );
    const removed: ReadonlySet<TFarmItem> = new Set(floorsToRemove);
    const isInTheWay = (farmItem: TFarmItem) =>
      keepsFloor ? !isFloor(farmItem) : !removed.has(farmItem);
    const tileBlocker = canBuildAt(farmMap, tile.x, tile.y, days)
      ? (findBushBlocker(farmMap, tile, days) ??
        findThingBlocker(farmItems, buildingDays, isInTheWay))
      : findGroundBlocker(farmMap, tile, days);

    if (tileBlocker === undefined) {
      freeTiles.push(tile);
    } else {
      blockedTiles.push(tile);
      blockers.push(tileBlocker);
    }

    removedFloors.push(...floorsToRemove);
  });

  const doorTile = getDoorTile(plannedBuilding);

  if (
    doorTile !== undefined &&
    !canOpenDoorAt(doorTile, currentItems, farmMap, days)
  ) {
    blockedTiles.push(doorTile);
    blockers.push({ type: "door" });
  }

  return {
    blockedTiles,
    blocker: blockers.at(0),
    fits: blockedTiles.length === 0,
    freeTiles,
    removedFloors,
  };
}

function endOn(
  installedEquipment: IInstalledEquipment,
  date: number,
): IInstalledEquipment {
  return { ...installedEquipment, dateDestroyed: date };
}

function getStartDay(farmItem: TFarmItem) {
  return farmItem.type === "equipment"
    ? farmItem.dateInstalled
    : farmItem.datePlanted;
}

function reopenFloor(
  floor: IInstalledEquipment,
  dateDestroyed: number | undefined,
): IInstalledEquipment {
  const { dateDestroyed: _ended, ...rest } = floor;

  return dateDestroyed === undefined ? rest : { ...rest, dateDestroyed };
}

// A building that the erase takes out of the plan never went down, so the
// floors that it took off come back. A floor that comes back ends when the
// next thing on its tile starts, as a new floor does. A demolish does not give
// them back, because the game took them off.
export function restoreFloors(
  currentItems: ICurrentItems,
  removedBuildings: readonly IPlannedBuilding[],
): IFarmEquipment {
  const newEquipment: IFarmEquipment = { ...currentItems.currentEquipment };

  removedBuildings.forEach((plannedBuilding) => {
    const building = getBuildingData(plannedBuilding);
    const { datePlaced } = plannedBuilding;
    const wasRemoved = (farmItem: TFarmItem) =>
      isFloor(farmItem) && farmItem.dateDestroyed === datePlaced;

    getFootprintTiles(plannedBuilding).forEach((tile) => {
      const farmItems = getFarmItemsAt(
        { ...currentItems, currentEquipment: newEquipment },
        tile,
      );

      if (
        keepsFloorAt(
          building,
          tile.x - plannedBuilding.x,
          tile.y - plannedBuilding.y,
        ) ||
        !farmItems.some(wasRemoved)
      ) {
        return;
      }

      const laterStarts = farmItems
        .filter((farmItem) => !wasRemoved(farmItem))
        .map(getStartDay)
        .filter((startDay) => startDay >= datePlaced);
      const nextStart =
        laterStarts.length === 0 ? undefined : Math.min(...laterStarts);

      newEquipment[tile.y] = {
        ...newEquipment[tile.y],
        [tile.x]: getEquipmentAtLocation(newEquipment, tile.x, tile.y).map(
          (installed) =>
            wasRemoved(installed)
              ? reopenFloor(installed, nextStart)
              : installed,
        ),
      };
    });
  });

  return newEquipment;
}

export function removeFloors(
  currentEquipment: IFarmEquipment,
  removedFloors: readonly IInstalledEquipment[],
  date: number,
): IFarmEquipment {
  const removed: ReadonlySet<IInstalledEquipment> = new Set(removedFloors);
  const newEquipment: IFarmEquipment = { ...currentEquipment };

  removedFloors.forEach(({ x, y }) => {
    newEquipment[y] = {
      ...newEquipment[y],
      [x]: getEquipmentAtLocation(newEquipment, x, y).map((installed) =>
        removed.has(installed) ? endOn(installed, date) : installed,
      ),
    };
  });

  return newEquipment;
}
