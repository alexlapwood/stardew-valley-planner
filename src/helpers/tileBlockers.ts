import { trees } from "../data/game/trees.json";
import { getTierOn } from "./buildingTiers";
import { findBushOver } from "./bushes";
import { type IDaySpan, isOverlapping } from "./daySpan";
import { getDefaultBuildings, isInSpot } from "./defaultBuildings";
import { getFarmItemDays } from "./farm";
import { flagsAt, isOnMap } from "./farmMap";
import { isFloorItem } from "./items";
import type { IPlacementDays } from "./placementRules";
import { getBuildingsOver, getFootprint } from "./plannedBuildings";

export type TBlockingThing = "bush" | "crop" | "floor" | "item" | "tree";

// date is the first day of the new building on which the blocker is there.
export type TTileBlocker =
  | { buildingId: string; date: number; isFixed: boolean; type: "building" }
  | { date: number; thing: TBlockingThing; type: "thing" }
  | { type: "door" }
  | { type: "ground" }
  | { type: "water" };

export type TFarmItemTest = (farmItem: TFarmItem) => boolean;

export function isFloor(farmItem: TFarmItem): farmItem is IInstalledEquipment {
  return farmItem.type === "equipment" && isFloorItem(farmItem.equipmentId);
}

export function findInTheWayOn(
  farmItems: readonly TFarmItem[],
  days: IDaySpan,
  isInTheWay: TFarmItemTest,
) {
  return farmItems
    .filter(
      (farmItem) =>
        isInTheWay(farmItem) && isOverlapping(getFarmItemDays(farmItem), days),
    )
    .toSorted(
      (a, b) => getFarmItemDays(a).firstDay - getFarmItemDays(b).firstDay,
    )
    .at(0);
}

function getBlockingThing(farmItem: TFarmItem): TBlockingThing {
  if (farmItem.type === "crop") {
    return "crop";
  }

  if (farmItem.type === "tree") {
    return trees[farmItem.treeId].type === "teaBush" ? "bush" : "tree";
  }

  return isFloor(farmItem) ? "floor" : "item";
}

const laterDay = (firstDay: number, { firstDay: buildingDay }: IDaySpan) =>
  Math.max(firstDay, buildingDay);

// The tile does not take a building on some of its days.
export function findGroundBlocker(
  farmMap: IFarmMap,
  { x, y }: IFarmTile,
  { buildings: otherBuildings, ...buildingDays }: IPlacementDays,
): TTileBlocker {
  const { water } = farmMap.ruleFlags;

  if (isOnMap(farmMap, x, y) && (flagsAt(farmMap, x, y) & water) === water) {
    return { type: "water" };
  }

  const fixed = getDefaultBuildings(farmMap).find(({ spot }) =>
    isInSpot(spot, x, y),
  );

  if (fixed !== undefined) {
    return {
      buildingId: fixed.buildingId,
      date: buildingDays.firstDay,
      isFixed: true,
      type: "building",
    };
  }

  const planned = getBuildingsOver(otherBuildings, buildingDays)
    .filter((other) => isInSpot(getFootprint(other), x, y))
    .toSorted((a, b) => a.datePlaced - b.datePlaced)
    .at(0);

  if (planned === undefined) {
    return { type: "ground" };
  }

  const date = laterDay(planned.datePlaced, buildingDays);

  return {
    buildingId: getTierOn(planned, date).buildingId,
    date,
    isFixed: false,
    type: "building",
  };
}

// The game needs the bushes cut before it builds on their tiles
// (GameLocation.isBuildable).
export function findBushBlocker(
  farmMap: IFarmMap,
  tile: IFarmTile,
  days: IPlacementDays,
): TTileBlocker | undefined {
  return findBushOver(farmMap, tile, days, days.cutBushes) === undefined
    ? undefined
    : { date: days.firstDay, thing: "bush", type: "thing" };
}

export function findThingBlocker(
  farmItems: readonly TFarmItem[],
  buildingDays: IDaySpan,
  isInTheWay: TFarmItemTest,
): TTileBlocker | undefined {
  const farmItem = findInTheWayOn(farmItems, buildingDays, isInTheWay);

  return farmItem === undefined
    ? undefined
    : {
        date: laterDay(getFarmItemDays(farmItem).firstDay, buildingDays),
        thing: getBlockingThing(farmItem),
        type: "thing",
      };
}
