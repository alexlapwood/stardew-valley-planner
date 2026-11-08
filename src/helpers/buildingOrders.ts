import { checkBuildingToPlace, type IBuildingCheck } from "./buildingPlacement";
import {
  findLimitRefusal,
  findNextGoodDate,
  searchDays,
  type TBuildingRefusal,
} from "./buildingRules";
import { withSkin } from "./buildingSkins";
import { getBaseBuildingId, getTierOn } from "./buildingTiers";
import type { IDragRegion } from "./dragPlacement";
import type { ICurrentItems } from "./itemPlacement";
import {
  getBuildingClick,
  getFootprintTiles,
  replaceBuilding,
  type TBuildingClick,
} from "./plannedBuildings";

export interface IOrderRequest {
  buildingId: string;
  currentItems: ICurrentItems;
  date: number;
  farmMap: IFarmMap;
  region: IDragRegion;
  skin?: string;
}

// after is the plan as the click would leave it.
interface IClickChange {
  after: readonly IPlannedBuilding[];
  before: readonly IPlannedBuilding[];
  click: TBuildingClick;
}

export interface IBuildingOrder extends IClickChange {
  check: IBuildingCheck;
  refusal?: TBuildingRefusal;
}

// The game does not check the tiles for an upgrade, because the higher tier
// has the same footprint (SV › CarpenterMenu.receiveLeftClick).
export function footprintCheck(
  plannedBuilding: Pick<IPlannedBuilding, "buildingId" | "x" | "y">,
  fits: boolean,
): IBuildingCheck {
  const footprint = getFootprintTiles(plannedBuilding);

  return {
    blockedTiles: fits ? [] : footprint,
    fits,
    freeTiles: fits ? footprint : [],
    removedFloors: [],
  };
}

function planClick(
  { buildingId, currentItems, region, skin }: IOrderRequest,
  date: number,
): IClickChange {
  const before = currentItems.currentBuildings ?? [];
  const click = getBuildingClick(before, buildingId, region, date);

  if (click.type === "new") {
    const plannedBuilding = withSkin(click.plannedBuilding, skin);

    return {
      after: [...before, plannedBuilding],
      before,
      click: { ...click, plannedBuilding },
    };
  }

  return {
    after:
      click.upgraded === undefined
        ? before
        : replaceBuilding(before, click.target, click.upgraded),
    before,
    click,
  };
}

function checkUpgrade(
  change: IClickChange,
  click: Extract<TBuildingClick, { type: "upgrade" }>,
  upgradeId: string,
  date: number,
): IBuildingOrder {
  const refusal: TBuildingRefusal | undefined =
    click.upgraded === undefined
      ? {
          fromId: getTierOn(click.target, date).buildingId,
          type: "upgrade",
          upgradeId,
        }
      : findLimitRefusal(change.before, change.after);

  return {
    ...change,
    check: footprintCheck(click.target, refusal === undefined),
    refusal,
  };
}

// The tiles come first, because they are about the spot under the cursor.
export function checkBuildingOrder(request: IOrderRequest): IBuildingOrder {
  const change = planClick(request, request.date);
  const { after, before, click } = change;

  if (click.type === "upgrade") {
    return checkUpgrade(change, click, request.buildingId, request.date);
  }

  const check = checkBuildingToPlace(
    click.plannedBuilding,
    request.currentItems,
    request.farmMap,
  );

  if (check.blocker !== undefined) {
    return {
      ...change,
      check,
      refusal: { blocker: check.blocker, type: "tile" },
    };
  }

  const refusal = findLimitRefusal(before, after);

  return {
    ...change,
    check:
      refusal === undefined
        ? check
        : footprintCheck(click.plannedBuilding, false),
    refusal,
  };
}

// A building that fits from a day also fits from each later day, because it
// has fewer days to check, so a search in halves finds the first day.
function findFirstFitDate({
  buildingId,
  currentItems,
  date,
  farmMap,
  region,
}: IOrderRequest) {
  const fitsOn = (day: number) =>
    checkBuildingToPlace(
      {
        buildingId: getBaseBuildingId(buildingId),
        datePlaced: day,
        x: region.x1,
        y: region.y1,
      },
      currentItems,
      farmMap,
    ).fits;
  let low = date + 1;
  let high = date + searchDays;

  if (!fitsOn(high)) {
    return undefined;
  }

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (fitsOn(middle)) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}

// A new building can fit on a later day, when the things on its tiles are
// gone or when a building that counts for a limit is demolished. An upgrade
// that the building cannot take on the date never fits later, because the
// tiers only go up.
export function findNextOrderDate(request: IOrderRequest) {
  if (planClick(request, request.date).click.type === "upgrade") {
    return undefined;
  }

  const firstFitDate = findFirstFitDate(request);

  return firstFitDate === undefined
    ? undefined
    : findNextGoodDate(
        request.date,
        (day) => {
          const change = planClick(request, day);

          return (
            change.click.type === "new" &&
            findLimitRefusal(change.before, change.after) === undefined
          );
        },
        firstFitDate,
      );
}
