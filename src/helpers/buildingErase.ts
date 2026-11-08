import { keepShownColorPaints } from "./buildingColors";
import { keepPaintsBefore } from "./buildingSkins";
import { withUpgrades } from "./buildingTiers";
import type { IDragRegion } from "./dragPlacement";
import { getFootprint, isBuildingHereToday } from "./plannedBuildings";

// An erase on the date of the building takes it out of the plan, and an erase
// on the date of an upgrade takes back that upgrade and the later ones, with
// the colour paints that only they could show. An erase on another day
// demolishes the building from that day. Undefined: the whole building goes.
export function eraseBuildingOn(
  plannedBuilding: IPlannedBuilding,
  date: number,
): IPlannedBuilding | undefined {
  if (date === plannedBuilding.datePlaced) {
    return undefined;
  }

  const upgrades = plannedBuilding.upgrades ?? [];
  const earlierUpgrades = upgrades.filter(
    ({ datePlaced }) => datePlaced < date,
  );

  if (upgrades.some(({ datePlaced }) => datePlaced === date)) {
    return keepShownColorPaints(
      withUpgrades(plannedBuilding, earlierUpgrades),
      date,
    );
  }

  return withUpgrades(
    keepPaintsBefore({ ...plannedBuilding, dateDestroyed: date }, date),
    earlierUpgrades,
  );
}

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
