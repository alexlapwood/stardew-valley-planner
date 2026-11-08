import { touchesRegion } from "./buildingErase";
import {
  findCut,
  getBushFootprint,
  getBushTiles,
  isBushHereOn,
} from "./bushes";
import type { IDaySpan } from "./daySpan";
import { isInSpot } from "./defaultBuildings";
import type { IDragRegion } from "./dragPlacement";
import {
  getCropsAtLocation,
  getEquipmentAtLocation,
  getFarmItemDays,
} from "./farm";
import type { ICurrentItems } from "./itemPlacement";
import { getBuildingDays, getDoorTile, getFootprint } from "./plannedBuildings";

// cutTiles are the tiles of the bushes that the erase cuts, and backTiles are
// the tiles of the cut bushes that it gives back.
export interface IBushErase {
  backTiles: IFarmTile[];
  cutBushes: readonly ICutBush[];
  cutTiles: IFarmTile[];
}

const hasDays = ({ firstDay, lastDay }: IDaySpan) =>
  lastDay === undefined || lastDay >= firstDay;

// The player cannot walk through a bush (Bush.isPassable), so a bush on the
// tile below the door stops the building, as a bush on its footprint does.
function needsTile(plannedBuilding: IPlannedBuilding, { x, y }: IFarmTile) {
  const doorTile = getDoorTile(plannedBuilding);

  return (
    isInSpot(getFootprint(plannedBuilding), x, y) ||
    (doorTile?.x === x && doorTile.y === y)
  );
}

function getThingDaysAt(currentItems: ICurrentItems, tile: IFarmTile) {
  const {
    currentBuildings = [],
    currentCrops,
    currentEquipment,
  } = currentItems;

  return [
    ...[
      ...getCropsAtLocation(currentCrops, tile.x, tile.y),
      ...getEquipmentAtLocation(currentEquipment, tile.x, tile.y),
    ].map(getFarmItemDays),
    ...currentBuildings
      .filter((plannedBuilding) => needsTile(plannedBuilding, tile))
      .map(getBuildingDays),
  ];
}

// A bush that comes back stays until the next thing on its tiles starts, as a
// floor that comes back does (restoreFloors).
function findNextStart(
  currentItems: ICurrentItems,
  bush: IFarmBush,
  date: number,
) {
  const starts = getBushTiles(bush)
    .flatMap((tile) => getThingDaysAt(currentItems, tile))
    .filter(hasDays)
    .map(({ firstDay }) => firstDay)
    .filter((firstDay) => firstDay >= date);

  return starts.length === 0 ? undefined : Math.min(...starts);
}

function setCut(
  cutBushes: readonly ICutBush[],
  { x, y }: IFarmTile,
  dateCut: number | undefined,
) {
  const others = cutBushes.filter((cut) => cut.x !== x || cut.y !== y);

  return dateCut === undefined ? others : [...others, { dateCut, x, y }];
}

// The erase cuts a bush that is on the farm on the date, and gives back a
// bush that it cut on the date. The game cannot cut a bush that is not
// destroyable (Bush.isDestroyable), so the erase leaves it.
export function planBushErase(
  farmMap: IFarmMap,
  currentItems: ICurrentItems,
  region: IDragRegion,
  date: number,
): IBushErase {
  const before = currentItems.currentCutBushes ?? [];
  const erase: IBushErase = { backTiles: [], cutBushes: before, cutTiles: [] };

  farmMap.bushes
    .filter(
      (bush) =>
        bush.destroyable && touchesRegion(getBushFootprint(bush), region),
    )
    .forEach((bush) => {
      if (isBushHereOn(bush, before, date)) {
        erase.cutBushes = setCut(erase.cutBushes, bush, date);
        erase.cutTiles.push(...getBushTiles(bush));
        return;
      }

      if (findCut(before, bush)?.dateCut !== date) {
        return;
      }

      const nextStart = findNextStart(currentItems, bush, date);

      if (nextStart !== date) {
        erase.cutBushes = setCut(erase.cutBushes, bush, nextStart);
        erase.backTiles.push(...getBushTiles(bush));
      }
    });

  return erase;
}
