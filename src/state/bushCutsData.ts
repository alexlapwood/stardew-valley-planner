import { findCut } from "../helpers/bushes";
import type { TFarmId } from "../helpers/farmMapLoader";
import type { IBadItem, IFarmData } from "./farmData";

export type TLoadBushes = (
  farm: TFarmId,
) => Promise<readonly IFarmBush[] | undefined>;

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function toCut(value: unknown): ICutBush | undefined {
  return typeof value === "object" &&
    value !== null &&
    "dateCut" in value &&
    typeof value.dateCut === "number" &&
    "x" in value &&
    isWholeNumber(value.x) &&
    "y" in value &&
    isWholeNumber(value.y)
    ? { dateCut: value.dateCut, x: value.x, y: value.y }
    : undefined;
}

// The plan file has no farm map, so this reads only the shape of each cut,
// and keepCutsOfBushes checks the cuts against the bushes of the farm.
export function readCutBushes(value: unknown) {
  const badItems: IBadItem[] = [];
  const cutBushes: ICutBush[] = [];

  if (value !== undefined && !Array.isArray(value)) {
    badItems.push({ path: "cutBushes", value });
  }

  const entries: readonly unknown[] = Array.isArray(value) ? value : [];

  entries.forEach((entry, index) => {
    const cut = toCut(entry);

    if (cut === undefined || findCut(cutBushes, cut) !== undefined) {
      badItems.push({ path: `cutBushes[${index}]`, value: entry });
    } else {
      cutBushes.push(cut);
    }
  });

  return { badItems, cutBushes };
}

// The game cuts only a destroyable bush (Bush.isDestroyable).
export function keepCutsOfBushes(
  cutBushes: readonly ICutBush[],
  bushes: readonly IFarmBush[],
) {
  const badItems: IBadItem[] = [];
  const goodCuts: ICutBush[] = [];

  cutBushes.forEach((cut, index) => {
    const isOfBush = (bush: IFarmBush) =>
      bush.destroyable && bush.x === cut.x && bush.y === cut.y;

    if (bushes.some(isOfBush)) {
      goodCuts.push(cut);
    } else {
      badItems.push({ path: `cutBushes[${index}]`, value: cut });
    }
  });

  return { badItems, cutBushes: goodCuts };
}

// When the bushes do not load, the cuts stay as they are, because the farm
// does not show with no map.
export async function checkCutsOnFarm<T extends IFarmData>(
  data: T,
  loadBushes: TLoadBushes,
): Promise<{ badItems: IBadItem[]; data: T }> {
  const bushes = await loadBushes(data.farm).catch((error: unknown) => {
    console.error(`Could not load the bushes of the ${data.farm} farm.`, error);
  });

  if (bushes === undefined) {
    return { badItems: [], data };
  }

  const kept = keepCutsOfBushes(data.cutBushes, bushes);

  return {
    badItems: kept.badItems,
    data:
      kept.badItems.length === 0
        ? data
        : { ...data, cutBushes: kept.cutBushes },
  };
}
