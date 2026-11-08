import { buildings } from "../data/game/buildings.json";
import { getColorsOn } from "./buildingColors";
import { getLookKeyOn } from "./buildingSkins";
import {
  getTierOn,
  getTiers,
  getTiersOver,
  getTopBuildingId,
  isUpgradeTier,
  orderChain,
  orderUpgrade,
} from "./buildingTiers";
import { type IDaySpan, isOnDay, isOverlapping } from "./daySpan";
import { type IPlacedBuilding, isInSpot } from "./defaultBuildings";
import type { IDragRegion } from "./dragPlacement";

type TBuildingAt = Pick<IPlannedBuilding, "buildingId" | "x" | "y">;

// Every farm starts with the farmhouse and the greenhouse, and the game has no
// way to build another one.
const fixedBuildingIds: ReadonlySet<string> = new Set([
  "farmhouse",
  "greenhouse",
]);

export const plannableBuildingIds = Object.keys(buildings).filter(
  (buildingId) => !fixedBuildingIds.has(buildingId),
);

export function isPlannableBuilding(buildingId: string) {
  return (
    Object.hasOwn(buildings, buildingId) && !fixedBuildingIds.has(buildingId)
  );
}

// The plan keeps the lowest tier as the building, and each higher tier as an
// upgrade of it.
export function isGroundBuilding(buildingId: string) {
  return isPlannableBuilding(buildingId) && !isUpgradeTier(buildingId);
}

export function getBuildingData({
  buildingId,
}: Pick<TBuildingAt, "buildingId">) {
  return buildings[buildingId];
}

export function getFootprint(plannedBuilding: TBuildingAt): IFarmSpot {
  const { height, width } = getBuildingData(plannedBuilding).size;

  return { height, width, x: plannedBuilding.x, y: plannedBuilding.y };
}

export function getFootprintTiles(plannedBuilding: TBuildingAt) {
  const { height, width, x, y } = getFootprint(plannedBuilding);

  return Array.from({ length: height }, (_, dy) =>
    Array.from({ length: width }, (__, dx): IFarmTile => ({
      x: x + dx,
      y: y + dy,
    })),
  ).flat();
}

// The game checks the tile below the door of a new building. The door of the
// Cabin is in its footprint, so its footprint check covers that tile.
export function getDoorTile(
  plannedBuilding: TBuildingAt,
): IFarmTile | undefined {
  const { humanDoor, size } = getBuildingData(plannedBuilding);

  if (humanDoor === undefined || humanDoor.y + 1 < size.height) {
    return undefined;
  }

  return {
    x: plannedBuilding.x + humanDoor.x,
    y: plannedBuilding.y + humanDoor.y + 1,
  };
}

export function getBuildingDays({
  dateDestroyed,
  datePlaced,
}: Pick<IPlannedBuilding, "dateDestroyed" | "datePlaced">): IDaySpan {
  return {
    firstDay: datePlaced,
    lastDay: dateDestroyed === undefined ? undefined : dateDestroyed - 1,
  };
}

export function isBuildingHereToday(
  plannedBuilding: IPlannedBuilding,
  date: number,
) {
  return isOnDay(getBuildingDays(plannedBuilding), date);
}

export function getBuildingsOn(
  plannedBuildings: readonly IPlannedBuilding[],
  date: number,
) {
  return plannedBuildings.filter((plannedBuilding) =>
    isBuildingHereToday(plannedBuilding, date),
  );
}

export function toPlacedBuilding(
  plannedBuilding: TBuildingAt,
): IPlacedBuilding {
  return {
    building: getBuildingData(plannedBuilding),
    buildingId: plannedBuilding.buildingId,
    spot: getFootprint(plannedBuilding),
  };
}

export function toPlacedBuildingOn(
  plannedBuilding: IPlannedBuilding,
  date: number,
) {
  const { x, y } = plannedBuilding;

  return toPlacedBuilding({
    buildingId: getTierOn(plannedBuilding, date).buildingId,
    x,
    y,
  });
}

export function toLookedBuildingOn(
  plannedBuilding: IPlannedBuilding,
  date: number,
  buildingId = getTierOn(plannedBuilding, date).buildingId,
): IPlacedBuilding {
  const { x, y } = plannedBuilding;
  const lookKey = getLookKeyOn(plannedBuilding, date);
  const colors = getColorsOn(plannedBuilding, date);

  return {
    ...toPlacedBuilding({ buildingId, x, y }),
    ...(colors === undefined ? {} : { colors }),
    ...(lookKey === undefined ? {} : { lookKey }),
  };
}

export function getPlacedBuildingsOn(
  plannedBuildings: readonly IPlannedBuilding[],
  date: number,
): IPlacedBuilding[] {
  return getBuildingsOn(plannedBuildings, date).map((plannedBuilding) =>
    toLookedBuildingOn(plannedBuilding, date),
  );
}

export function getPlacedBuildingsOver(
  plannedBuildings: readonly IPlannedBuilding[],
  days: IDaySpan,
) {
  return plannedBuildings.flatMap(({ x, y, ...plannedBuilding }) =>
    getTiersOver(plannedBuilding, days).map(({ buildingId }) =>
      toPlacedBuilding({ buildingId, x, y }),
    ),
  );
}

// The preview shows the tier and the skin that the player picked.
export function toPreviewBuilding(plannedBuilding: IPlannedBuilding) {
  const { skin, x, y } = plannedBuilding;
  const placedBuilding = toPlacedBuilding({
    buildingId: getTopBuildingId(plannedBuilding),
    x,
    y,
  });

  return skin === undefined
    ? placedBuilding
    : { ...placedBuilding, lookKey: skin };
}

export function getBuildingsOver(
  plannedBuildings: readonly IPlannedBuilding[],
  days: IDaySpan,
) {
  return plannedBuildings.filter((plannedBuilding) =>
    isOverlapping(getBuildingDays(plannedBuilding), days),
  );
}

export function isOnPlannedBuilding(
  plannedBuildings: readonly IPlannedBuilding[],
  x: number,
  y: number,
  days: IDaySpan,
) {
  return getBuildingsOver(plannedBuildings, days).some((plannedBuilding) =>
    isInSpot(getFootprint(plannedBuilding), x, y),
  );
}

// A building changes the tiles when it is put down, on the date of each
// upgrade and when it is demolished.
export function getBuildingChangeDays(
  plannedBuildings: readonly IPlannedBuilding[],
) {
  const days = plannedBuildings.flatMap((plannedBuilding) => [
    ...getTiers(plannedBuilding).map(({ datePlaced }) => datePlaced),
    ...(plannedBuilding.dateDestroyed === undefined
      ? []
      : [plannedBuilding.dateDestroyed]),
  ]);

  return [...new Set(days)].toSorted((a, b) => a - b);
}

// As in the game, the tile under the cursor is the top-left of the building,
// so a drag moves the building with the cursor.
export function buildingForRegion(
  buildingId: string,
  region: IDragRegion,
  date: number,
): IPlannedBuilding {
  return { ...orderChain(buildingId, date), x: region.x1, y: region.y1 };
}

export function findBuildingAt(
  plannedBuildings: readonly IPlannedBuilding[],
  { x, y }: IFarmTile,
  date: number,
) {
  return getBuildingsOn(plannedBuildings, date).find((plannedBuilding) =>
    isInSpot(getFootprint(plannedBuilding), x, y),
  );
}

// No upgraded building: the tier is not above the target on the date.
export type TBuildingClick =
  | { target: IPlannedBuilding; type: "upgrade"; upgraded?: IPlannedBuilding }
  | { plannedBuilding: IPlannedBuilding; type: "new" };

// As in the game, an upgrade goes on the building under the cursor (SV ›
// CarpenterMenu.receiveLeftClick).
export function getUpgradeTarget(
  plannedBuildings: readonly IPlannedBuilding[],
  buildingId: string,
  region: IDragRegion,
  date: number,
) {
  return isUpgradeTier(buildingId)
    ? findBuildingAt(plannedBuildings, { x: region.x1, y: region.y1 }, date)
    : undefined;
}

export function getBuildingClick(
  plannedBuildings: readonly IPlannedBuilding[],
  buildingId: string,
  region: IDragRegion,
  date: number,
): TBuildingClick {
  const target = getUpgradeTarget(plannedBuildings, buildingId, region, date);

  if (target === undefined) {
    return {
      plannedBuilding: buildingForRegion(buildingId, region, date),
      type: "new",
    };
  }

  const upgraded = orderUpgrade(target, buildingId, date);

  return upgraded === undefined
    ? { target, type: "upgrade" }
    : { target, type: "upgrade", upgraded };
}

export function replaceBuilding(
  plannedBuildings: readonly IPlannedBuilding[],
  target: IPlannedBuilding,
  replacement: IPlannedBuilding,
) {
  return plannedBuildings.map((plannedBuilding) =>
    plannedBuilding === target ? replacement : plannedBuilding,
  );
}
