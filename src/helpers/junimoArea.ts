import { type IPlacedBuilding, isInSpot } from "./defaultBuildings";
import {
  canPlantAt,
  canPlantSaplingAt,
  type IPlacementDays,
} from "./placementRules";

type TAreaBuilding = Pick<IPlacedBuilding, "building" | "spot">;

// The game looks at each tile out to the radius from the centre tile of the
// hut (SV › JunimoHut.areThereMatureCropsWithinRadius).
export function getJunimoAreaTiles({
  building,
  spot,
}: TAreaBuilding): IFarmTile[] {
  const { harvestArea } = building;

  if (harvestArea === undefined) {
    return [];
  }

  const { center, radius } = harvestArea;
  const side = radius * 2 + 1;

  return Array.from({ length: side }, (_, dy) =>
    Array.from({ length: side }, (__, dx): IFarmTile => ({
      x: spot.x + center.x - radius + dx,
      y: spot.y + center.y - radius + dy,
    })),
  ).flat();
}

// The Junimos harvest crops and tea bushes, and a tea bush can grow on ground
// that takes no crop (SV › JunimoHarvester).
function canGrowHarvestAt(
  map: IFarmMap,
  x: number,
  y: number,
  days: IPlacementDays,
) {
  return canPlantAt(map, x, y, days) || canPlantSaplingAt(map, x, y, days);
}

// shownBuildings are the buildings that stand on the date, with the building
// of the preview. The preview building is not in the plan, so the tile rules
// of the plan do not take its tiles off.
export function getJunimoAreaMap(
  shownBuildings: readonly TAreaBuilding[],
  farmMap: IFarmMap,
  date: number,
  plannedBuildings: readonly IPlannedBuilding[],
  cutBushes?: readonly ICutBush[],
) {
  const areaMap: number[][] = [];
  const days: IPlacementDays = {
    buildings: plannedBuildings,
    cutBushes,
    firstDay: date,
    lastDay: date,
  };
  const isOnShownBuilding = (x: number, y: number) =>
    shownBuildings.some(({ spot }) => isInSpot(spot, x, y));

  shownBuildings.flatMap(getJunimoAreaTiles).forEach(({ x, y }) => {
    if (
      areaMap[x]?.[y] !== undefined ||
      isOnShownBuilding(x, y) ||
      !canGrowHarvestAt(farmMap, x, y, days)
    ) {
      return;
    }

    if (areaMap[x] === undefined) {
      areaMap[x] = [];
    }

    areaMap[x][y] = 0;
  });

  return areaMap;
}
