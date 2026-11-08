import type { TPaintBlock } from "./buildingColors";
import { findNewLimitBreak, type ILimitBreak } from "./buildingLimits";
import type { TTileBlocker } from "./tileBlockers";

// houseBuilt: the house has the level already. painted: the building has the
// picked look already. colored: the building has the colours already, or no
// paint when hasPaint is false. unpaintable: the building, as it is on the
// date, cannot take paint. upgrade: upgradeId is not above fromId, the tier
// on the date.
export type TBuildingRefusal =
  | ({ type: "limit" } & ILimitBreak)
  | { blocker: TTileBlocker; type: "tile" }
  | { block: TPaintBlock; buildingId: string; type: "unpaintable" }
  | { buildingId: string; hasPaint: boolean; type: "colored" }
  | { buildingId: string; type: "painted" }
  | { fromId: string; type: "upgrade"; upgradeId: string }
  | { level: number; type: "houseBuilt" }
  | { type: "repaired" };

// The next good day is in the year after the date, so that the search stays
// quick for each move of the cursor.
export const searchDays = 4 * 28;

export function findLimitRefusal(
  before: readonly IPlannedBuilding[],
  after: readonly IPlannedBuilding[],
): TBuildingRefusal | undefined {
  const limitBreak = findNewLimitBreak(before, after);

  return limitBreak === undefined
    ? undefined
    : { ...limitBreak, type: "limit" };
}

export function findNextGoodDate(
  date: number,
  isGoodOn: (date: number) => boolean,
  firstDate = date + 1,
) {
  for (let day = firstDate; day <= date + searchDays; day += 1) {
    if (isGoodOn(day)) {
      return day;
    }
  }

  return undefined;
}
