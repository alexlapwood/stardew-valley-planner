import { eraseBuildingOn } from "./buildingTiers";
import type { IDragRegion } from "./dragPlacement";
import { getFootprint, isBuildingHereToday } from "./plannedBuildings";

export function touchesRegion(
  { height, width, x, y }: IFarmSpot,
  region: IDragRegion,
) {
  return (
    x <= Math.max(region.x1, region.x2) &&
    x + width - 1 >= Math.min(region.x1, region.x2) &&
    y <= Math.max(region.y1, region.y2) &&
    y + height - 1 >= Math.min(region.y1, region.y2)
  );
}

export function findBuildingsToErase(
  plannedBuildings: readonly IPlannedBuilding[],
  region: IDragRegion,
  date: number,
) {
  return plannedBuildings.filter(
    (plannedBuilding) =>
      isBuildingHereToday(plannedBuilding, date) &&
      touchesRegion(getFootprint(plannedBuilding), region),
  );
}

export function eraseEachBuilding(
  plannedBuildings: readonly IPlannedBuilding[],
  toErase: readonly IPlannedBuilding[],
  date: number,
) {
  const erased: ReadonlySet<IPlannedBuilding> = new Set(toErase);

  return plannedBuildings.flatMap((plannedBuilding) => {
    if (!erased.has(plannedBuilding)) {
      return [plannedBuilding];
    }

    const kept = eraseBuildingOn(plannedBuilding, date);

    return kept === undefined ? [] : [kept];
  });
}

// The buildings that the erase takes out of the plan, because it is on the
// date that they go down.
export function getRemovedBuildings(
  toErase: readonly IPlannedBuilding[],
  date: number,
) {
  return toErase.filter(
    (plannedBuilding) => eraseBuildingOn(plannedBuilding, date) === undefined,
  );
}
