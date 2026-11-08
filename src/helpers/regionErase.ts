import { eraseEachBuilding, getRemovedBuildings } from "./buildingErase";
import { restoreFloors } from "./buildingPlacement";
import { type IBushErase, planBushErase } from "./bushCuts";
import type { IDragRegion } from "./dragPlacement";
import { forEachTileInRegion } from "./farm";
import { type IFixedErase, planFarmErase } from "./fixedBuildingErase";
import {
  destroyCrops,
  destroyEquipment,
  type ICurrentItems,
} from "./itemPlacement";

// buildings, crops and equipment are the plan after the erase, and
// erasedBuildings are the planned buildings that the erase changes.
export interface IRegionErase {
  buildings: IPlannedBuilding[];
  bushes: IBushErase;
  crops: IFarmCrops;
  equipment: IFarmEquipment;
  erasedBuildings: IPlannedBuilding[];
  fixed: IFixedErase;
}

// The preview runs this for each frame, so the plan that it reads must not
// change: each erased tile gets new copies of its things.
function eraseTiles<T extends TFarmItem>(
  farmItems: IFarmItems<T[]>,
  region: IDragRegion,
  destroy: (tileItems: T[]) => T[],
) {
  const erased: IFarmItems<T[]> = { ...farmItems };

  forEachTileInRegion(region, (x, y) => {
    const tileItems = farmItems[y]?.[x];

    if (tileItems !== undefined) {
      erased[y] = {
        ...erased[y],
        [x]: destroy(tileItems.map((farmItem) => ({ ...farmItem }))),
      };
    }
  });

  return erased;
}

// The floors come back after the crops and items of the region are erased,
// because they were not on the tiles on the date of the erase. The bushes go
// last, because a bush that comes back stays until the next thing that the
// erase leaves on its tiles.
export function planRegionErase(
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  region: IDragRegion,
  date: number,
): IRegionErase {
  const { buildings: erasedBuildings, fixed } = planFarmErase(
    currentItems,
    farmMap,
    region,
    date,
  );
  const crops = eraseTiles(currentItems.currentCrops, region, (tileCrops) =>
    destroyCrops(tileCrops, date),
  );
  const equipment = restoreFloors(
    {
      currentCrops: crops,
      currentEquipment: eraseTiles(
        currentItems.currentEquipment,
        region,
        (tileEquipment) => destroyEquipment(tileEquipment, date),
      ),
    },
    getRemovedBuildings(erasedBuildings, date),
  );
  const buildings = eraseEachBuilding(
    currentItems.currentBuildings ?? [],
    erasedBuildings,
    date,
  );
  const bushes = planBushErase(
    farmMap,
    {
      currentBuildings: buildings,
      currentCrops: crops,
      currentCutBushes: currentItems.currentCutBushes,
      currentEquipment: equipment,
    },
    region,
    date,
  );

  return { buildings, bushes, crops, equipment, erasedBuildings, fixed };
}
