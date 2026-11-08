import { getSeasonName } from "../../helpers/date";
import {
  getBuildingsNextChange,
  getDefaultBuildings,
} from "../../helpers/defaultBuildings";
import { getFarmLooksOn } from "../../helpers/farmLooks";
import { getHouseLook } from "../../helpers/houseUpgrades";
import { earliestChange } from "../../helpers/mapFrames";
import { toPreviewBuilding } from "../../helpers/plannedBuildings";
import {
  getDrawnBuildingsOn,
  type IBuildScene,
} from "../../helpers/renderBuildingSites";
import { getPassesNextChange } from "../../helpers/renderFarmMap";
import type { IBuildingPreview } from "./Farm.preview";

export interface IPlanBuildings {
  buildingPreview?: IBuildingPreview;
  buildings: readonly IPlannedBuilding[];
  date: number;
  greenhouseRepair?: IPlannedRepair;
  houseColorPaints?: readonly IPlannedColorPaint[];
  houseUpgrades?: readonly IPlannedHouseUpgrade[];
  petBowlPaints?: readonly IPlannedPaint[];
}

export function getFixedLooks(
  plan: IPlanBuildings,
  buildingPreview: IBuildingPreview | undefined,
  { house }: IBuildScene,
): IFarmLooks {
  const looks = getFarmLooksOn(
    {
      currentGreenhouseRepair: plan.greenhouseRepair,
      currentHouseColorPaints:
        buildingPreview?.houseColorPaints ?? plan.houseColorPaints,
      currentHouseUpgrades: plan.houseUpgrades,
      currentPetBowlPaints:
        buildingPreview?.petBowlPaints ?? plan.petBowlPaints,
    },
    plan.date,
  );

  return house === undefined
    ? looks
    : { ...looks, house: getHouseLook(house.level) };
}

export function getShownBuildings(
  { buildings, date }: IPlanBuildings,
  buildingPreview: IBuildingPreview | undefined,
  buildScene: IBuildScene,
) {
  const newBuilding = buildingPreview?.newBuilding;

  return [
    ...getDrawnBuildingsOn(
      buildingPreview?.buildings ?? buildings,
      date,
      buildScene,
    ),
    ...(newBuilding === undefined ? [] : [toPreviewBuilding(newBuilding)]),
  ];
}

const noBuilds: IBuildScene = { built: new Set(), sites: [], upgrading: [] };

// The build animations keep their own clock, so this clock takes the
// buildings as they are when no build plays.
export function getPlanNextChange(map: IFarmMap, plan: IPlanBuildings) {
  const { buildingPreview } = plan;
  const looks = getFixedLooks(plan, buildingPreview, noBuilds);

  return earliestChange([
    getPassesNextChange(map, ["front", "above"]),
    getBuildingsNextChange(
      [
        ...getDefaultBuildings(map, looks),
        ...getShownBuildings(plan, buildingPreview, noBuilds),
      ],
      getSeasonName(plan.date),
    ),
  ]);
}
