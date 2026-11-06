import { trees } from "../data/game/trees.json";
import { isOnDefaultBuilding } from "./defaultBuildings";
import { squareAround } from "./dragPlacement";
import {
  forEachTileInRegion,
  getCropsAtLocation,
  getEquipmentAtLocation,
  getPlantedLastDay,
} from "./farm";
import { isFloorItem } from "./items";
import type { ITreeSchedule } from "./tree";

export interface IGrowthPlan {
  currentCrops: IFarmCrops;
  currentEquipment: IFarmEquipment;
  farmMap: IFarmMap;
}

// No lastDay: the thing stays.
interface IDaySpan {
  firstDay: number;
  lastDay?: number;
}

interface IBlockerSpan extends IDaySpan, IFarmTile {}

const alwaysThere: IDaySpan = { firstDay: Number.NEGATIVE_INFINITY };

// The planner has no furniture, and the game keeps every item that is not a
// floor as an object.
function getBlockerKind(farmItem: TFarmItem): TTreeGrowthBlocker {
  if (farmItem.type === "crop") {
    return "crop";
  }

  if (farmItem.type === "tree") {
    return trees[farmItem.treeId].type;
  }

  return isFloorItem(farmItem.equipmentId) ? "floor" : "object";
}

function getDaySpan(farmItem: TFarmItem): IDaySpan {
  if (farmItem.type === "equipment") {
    return {
      firstDay: farmItem.dateInstalled,
      lastDay:
        farmItem.dateDestroyed === undefined
          ? undefined
          : farmItem.dateDestroyed - 1,
    };
  }

  return {
    firstDay: farmItem.datePlanted,
    lastDay: getPlantedLastDay(farmItem),
  };
}

function isOnDay({ firstDay, lastDay }: IDaySpan, date: number) {
  return date >= firstDay && (lastDay === undefined || date <= lastDay);
}

function getGrowthBlockerSpans(
  { currentCrops, currentEquipment, farmMap }: IGrowthPlan,
  plantedTree: IPlantedTree,
) {
  const { growthBlockers, growthClearance } =
    trees[plantedTree.treeId].placement;
  const spans: IBlockerSpan[] = [];

  if (growthBlockers === undefined || growthClearance === undefined) {
    return spans;
  }

  const blockers = new Set(growthBlockers);

  forEachTileInRegion(squareAround(plantedTree, growthClearance), (x, y) => {
    if (x === plantedTree.x && y === plantedTree.y) {
      return;
    }

    if (blockers.has("building") && isOnDefaultBuilding(farmMap, x, y)) {
      spans.push({ x, y, ...alwaysThere });
    }

    [
      ...getCropsAtLocation(currentCrops, x, y),
      ...getEquipmentAtLocation(currentEquipment, x, y),
    ]
      .filter((farmItem) => blockers.has(getBlockerKind(farmItem)))
      .forEach((farmItem) => {
        spans.push({ x, y, ...getDaySpan(farmItem) });
      });
  });

  return spans;
}

export function getGrowthBlockersOn(
  plan: IGrowthPlan,
  plantedTree: IPlantedTree,
  date: number,
) {
  const tiles = new Map<string, IFarmTile>();

  getGrowthBlockerSpans(plan, plantedTree)
    .filter((span) => isOnDay(span, date))
    .forEach(({ x, y }) => {
      tiles.set(`${x},${y}`, { x, y });
    });

  return [...tiles.values()];
}

function getBlockedSpans(spans: readonly IDaySpan[], from: number) {
  const merged: IDaySpan[] = [];

  spans
    .map(({ firstDay, lastDay }) => ({
      firstDay: Math.max(firstDay, from),
      lastDay,
    }))
    .filter(
      ({ firstDay, lastDay }) => lastDay === undefined || lastDay >= firstDay,
    )
    .toSorted((a, b) => a.firstDay - b.firstDay)
    .forEach((span) => {
      const last = merged.at(-1);

      if (
        last === undefined ||
        (last.lastDay !== undefined && span.firstDay > last.lastDay + 1)
      ) {
        merged.push(span);
        return;
      }

      last.lastDay =
        last.lastDay === undefined || span.lastDay === undefined
          ? undefined
          : Math.max(last.lastDay, span.lastDay);
    });

  return merged;
}

// The game grows a tree in the night after each day with no blocker beside it,
// so the growth of a day shows on the next morning.
function getDateOfGrowth(
  datePlanted: number,
  blockedSpans: readonly IDaySpan[],
  growthDays: number,
) {
  let day = datePlanted;
  let grown = 0;

  for (const { firstDay, lastDay } of blockedSpans) {
    const freeDays = firstDay - day;

    if (grown + freeDays >= growthDays) {
      return day + growthDays - grown;
    }

    if (lastDay === undefined) {
      return undefined;
    }

    grown += freeDays;
    day = lastDay + 1;
  }

  return day + growthDays - grown;
}

function makeTreeSchedule(
  plan: IGrowthPlan,
  plantedTree: IPlantedTree,
): ITreeSchedule {
  const { daysToMature, stages } = trees[plantedTree.treeId];
  const blockedSpans = getBlockedSpans(
    getGrowthBlockerSpans(plan, plantedTree),
    plantedTree.datePlanted,
  );
  const dateOfGrowth = (growthDays: number) =>
    getDateOfGrowth(plantedTree.datePlanted, blockedSpans, growthDays);

  return {
    matureDate: dateOfGrowth(daysToMature),
    stageDates: stages.map(dateOfGrowth),
  };
}

let cachedPlan: IGrowthPlan | undefined;
let cachedSchedules = new Map<string, ITreeSchedule>();

function isSamePlan(a: IGrowthPlan | undefined, b: IGrowthPlan) {
  return (
    a !== undefined &&
    a.currentCrops === b.currentCrops &&
    a.currentEquipment === b.currentEquipment &&
    a.farmMap === b.farmMap
  );
}

// A plan change sets new crops or equipment objects and never changes the old
// ones, so the schedules stay good until one of the objects is new.
function getPlanSchedules(plan: IGrowthPlan) {
  if (!isSamePlan(cachedPlan, plan)) {
    cachedPlan = plan;
    cachedSchedules = new Map();
  }

  return cachedSchedules;
}

export function getTreeSchedule(plan: IGrowthPlan, plantedTree: IPlantedTree) {
  const schedules = getPlanSchedules(plan);
  const { datePlanted, treeId, x, y } = plantedTree;
  const key = `${x},${y},${datePlanted},${treeId}`;
  const cached = schedules.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const schedule = makeTreeSchedule(plan, plantedTree);
  schedules.set(key, schedule);

  return schedule;
}
