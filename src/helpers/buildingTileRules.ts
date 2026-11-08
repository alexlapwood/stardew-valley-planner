import type { IDaySpan } from "./daySpan";
import { getDefaultBuildings, type IPlacedBuilding } from "./defaultBuildings";
import { isOnMap } from "./farmMap";
import {
  getBuildingChangeDays,
  getBuildingsOn,
  toPlacedBuildingOn,
} from "./plannedBuildings";

type TRuledBuilding = Pick<IPlacedBuilding, "building" | "spot">;

interface IFlagChange {
  clear: number;
  set: number;
}

const unchangedTile = ".";

function getChangeableBits(ruleFlags: IFarmRuleFlags) {
  const bits = new Map<string, number>(Object.entries(ruleFlags));

  // The game draws the water from the map, and no building can go on it.
  bits.delete("water");

  return bits;
}

function toFlagChange(
  bits: ReadonlyMap<string, number>,
  change: Partial<Record<string, boolean>>,
): IFlagChange {
  const flagChange = { clear: 0, set: 0 };

  Object.entries(change).forEach(([flagName, value]) => {
    const bit = bits.get(flagName) ?? 0;

    if (value === true) {
      flagChange.set |= bit;
    } else if (value === false) {
      flagChange.clear |= bit;
    }
  });

  return flagChange;
}

function getFlagChanges(ruleFlags: IFarmRuleFlags, rules: IBuildingTileRules) {
  const bits = getChangeableBits(ruleFlags);

  return new Map(
    Object.entries(rules.changes).map(([key, change]) => [
      key,
      toFlagChange(bits, change ?? {}),
    ]),
  );
}

function collectChanges(
  map: IFarmMap,
  { building, spot }: TRuledBuilding,
  set: Uint8Array,
  clear: Uint8Array,
) {
  const { radius, rows } = building.tileRules;
  const flagChanges = getFlagChanges(map.ruleFlags, building.tileRules);

  rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((key, column) => {
      const x = spot.x - radius + column;
      const y = spot.y - radius + rowIndex;

      if (key === unchangedTile || !isOnMap(map, x, y)) {
        return;
      }

      const change = flagChanges.get(key);

      if (change === undefined) {
        throw new Error(
          `The ${building.buildingId} tile rules have no change for "${key}".`,
        );
      }

      const cell = y * map.width + x;
      set[cell] |= change.set;
      clear[cell] |= change.clear;
    });
  });
}

export function applyBuildingTileRules(
  map: IFarmMap,
  ruledBuildings: readonly TRuledBuilding[],
) {
  const set = new Uint8Array(map.flags.length);
  const clear = new Uint8Array(map.flags.length);

  ruledBuildings.forEach((ruledBuilding) => {
    collectChanges(map, ruledBuilding, set, clear);
  });

  const { blocked, buildable } = map.ruleFlags;

  return map.flags.map((mapFlags, cell) => {
    const flags = (mapFlags | set[cell]) & ~clear[cell];

    return (flags & blocked) === 0 ? flags : flags & ~buildable;
  });
}

const placementFlagsByMap = new WeakMap<
  IFarmMap,
  { flags: Uint8Array; spots: IFarmSpots }
>();

export function getPlacementFlags(map: IFarmMap) {
  const cached = placementFlagsByMap.get(map);

  if (cached?.spots === map.spots) {
    return cached.flags;
  }

  const flags = applyBuildingTileRules(map, getDefaultBuildings(map));
  placementFlagsByMap.set(map, { flags, spots: map.spots });

  return flags;
}

// The flags change only on the days when a planned building comes or goes, so
// the days between 2 change days share 1 set of flags.
interface IPlanFlags {
  changeDays: number[];
  flagsByPeriod: Map<number, Uint8Array>;
}

export interface ITileFlagsOverDays {
  onEveryDay: number;
  onSomeDay: number;
}

const planFlagsByMap = new WeakMap<
  IFarmMap,
  {
    byBuildings: WeakMap<readonly IPlannedBuilding[], IPlanFlags>;
    spots: IFarmSpots;
  }
>();

function getPlanFlags(
  map: IFarmMap,
  plannedBuildings: readonly IPlannedBuilding[],
) {
  let cachedMap = planFlagsByMap.get(map);

  if (cachedMap?.spots !== map.spots) {
    cachedMap = { byBuildings: new WeakMap(), spots: map.spots };
    planFlagsByMap.set(map, cachedMap);
  }

  let planFlags = cachedMap.byBuildings.get(plannedBuildings);

  if (planFlags === undefined) {
    planFlags = {
      changeDays: getBuildingChangeDays(plannedBuildings),
      flagsByPeriod: new Map(),
    };
    cachedMap.byBuildings.set(plannedBuildings, planFlags);
  }

  return planFlags;
}

function getPeriod(changeDays: readonly number[], date: number) {
  const period = changeDays.findIndex((day) => day > date);

  return period === -1 ? changeDays.length : period;
}

export function getPlacementFlagsOn(
  map: IFarmMap,
  plannedBuildings: readonly IPlannedBuilding[],
  date: number,
) {
  if (plannedBuildings.length === 0) {
    return getPlacementFlags(map);
  }

  const { changeDays, flagsByPeriod } = getPlanFlags(map, plannedBuildings);
  const period = getPeriod(changeDays, date);
  const cached = flagsByPeriod.get(period);

  if (cached !== undefined) {
    return cached;
  }

  const standing = getBuildingsOn(plannedBuildings, date);
  const flags =
    standing.length === 0
      ? getPlacementFlags(map)
      : applyBuildingTileRules(map, [
          ...getDefaultBuildings(map),
          ...standing.map((plannedBuilding) =>
            toPlacedBuildingOn(plannedBuilding, date),
          ),
        ]);
  flagsByPeriod.set(period, flags);

  return flags;
}

// A thing on a tile for some days needs the flags of each of those days, so
// the rules can ask for a flag on every day, or for no flag on any day.
export function getTileFlagsOverDays(
  map: IFarmMap,
  plannedBuildings: readonly IPlannedBuilding[],
  { x, y }: IFarmTile,
  { firstDay, lastDay }: IDaySpan,
): ITileFlagsOverDays {
  const cell = y * map.width + x;

  if (plannedBuildings.length === 0) {
    const flags = getPlacementFlags(map)[cell];

    return { onEveryDay: flags, onSomeDay: flags };
  }

  const { changeDays } = getPlanFlags(map, plannedBuildings);
  const laterChangeDays = changeDays.filter(
    (day) => day > firstDay && (lastDay === undefined || day <= lastDay),
  );

  return [firstDay, ...laterChangeDays].reduce(
    ({ onEveryDay, onSomeDay }, day) => {
      const flags = getPlacementFlagsOn(map, plannedBuildings, day)[cell];

      return { onEveryDay: onEveryDay & flags, onSomeDay: onSomeDay | flags };
    },
    { onEveryDay: 0xff, onSomeDay: 0 },
  );
}
