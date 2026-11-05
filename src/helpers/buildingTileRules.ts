import { getDefaultBuildings, type IPlacedBuilding } from "./defaultBuildings";
import { isOnMap } from "./farmMap";

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
