import type { IBadItem } from "./farmData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// The floor was on its tile on the order day, so it started on or before that
// day and ended after it.
function toEndedFloor(
  value: unknown,
  datePlaced: number,
): IEndedFloor | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { dateDestroyed, dateInstalled, x, y } = value;
  const isGood =
    typeof dateInstalled === "number" &&
    dateInstalled <= datePlaced &&
    (dateDestroyed === undefined ||
      (typeof dateDestroyed === "number" && dateDestroyed > datePlaced)) &&
    isIndex(x) &&
    isIndex(y);

  if (!isGood) {
    return undefined;
  }

  return dateDestroyed === undefined
    ? { dateInstalled, x, y }
    : { dateDestroyed, dateInstalled, x, y };
}

// Each floor comes back on its own, so a bad floor drops only itself.
export function readEndedFloors(
  plannedBuilding: IPlannedBuilding,
  path: string,
) {
  const { endedFloors: _endedFloors, ...withoutFloors } = plannedBuilding;
  const value: unknown = plannedBuilding.endedFloors;
  const badItems: IBadItem[] = [];
  const endedFloors: IEndedFloor[] = [];

  if (value !== undefined && !Array.isArray(value)) {
    badItems.push({ path: `${path}.endedFloors`, value });
  }

  const entries: readonly unknown[] = Array.isArray(value) ? value : [];

  entries.forEach((entry, index) => {
    const endedFloor = toEndedFloor(entry, plannedBuilding.datePlaced);

    if (endedFloor === undefined) {
      badItems.push({ path: `${path}.endedFloors[${index}]`, value: entry });
    } else {
      endedFloors.push(endedFloor);
    }
  });

  return {
    badItems,
    plannedBuilding:
      endedFloors.length === 0
        ? withoutFloors
        : { ...withoutFloors, endedFloors },
  };
}
