import { checkColorPaint } from "../../helpers/buildingColorPaint";
import {
  checkBuildingOrder,
  findNextOrderDate,
  type IOrderRequest,
} from "../../helpers/buildingOrders";
import { checkPaint, type IPaintRequest } from "../../helpers/buildingPaint";
import type { IBuildingCheck } from "../../helpers/buildingPlacement";
import {
  describeNextGoodDate,
  describeRefusal,
  type IReasonLine,
} from "../../helpers/buildingReasons";
import type { TBuildingRefusal } from "../../helpers/buildingRules";
import {
  checkFixedOrder,
  type IFixedUpgradeItem,
  isFixedUpgradeItem,
} from "../../helpers/fixedBuildingOrders";
import type { ICurrentItems } from "../../helpers/itemPlacement";
import type { IRegion } from "./Farm.region";

// buildings, houseColorPaints and petBowlPaints are the plan as the click
// would leave it, so an upgrade preview shows the new tier, and a paint
// preview shows the new look or colours.
export interface IBuildingPreview {
  buildings: readonly IPlannedBuilding[];
  check: IBuildingCheck;
  houseColorPaints?: readonly IPlannedColorPaint[];
  newBuilding?: IPlannedBuilding;
  petBowlPaints?: readonly IPlannedPaint[];
  refusal?: TBuildingRefusal;
}

// tile is the tile under the cursor.
export interface IPlanNotice {
  lines: IReasonLine[];
  tile: IFarmTile;
}

export interface IPreviewState {
  currentItems: ICurrentItems;
  date: number;
  farmMap: IFarmMap;
  highlightedRegion?: IRegion;
  selectedItem?: ISelectedItem;
}

function toOrderRequest(
  { currentItems, date, farmMap }: IPreviewState,
  { id, skin }: ISelectedItem,
  region: IRegion,
): IOrderRequest & IPaintRequest {
  return { buildingId: id, currentItems, date, farmMap, region, skin };
}

function getPaintPreview(
  { currentItems }: IPreviewState,
  request: IPaintRequest,
): IBuildingPreview | undefined {
  const paint = checkPaint(request);
  const change = paint?.change;

  return paint === undefined
    ? undefined
    : {
        buildings:
          change?.type === "building"
            ? change.buildings
            : (currentItems.currentBuildings ?? []),
        check: paint.check,
        ...(change?.type === "petBowl"
          ? { petBowlPaints: change.petBowlPaints }
          : {}),
        refusal: paint.refusal,
      };
}

function getColorPaintPreview(
  { currentItems, date, farmMap }: IPreviewState,
  { colors }: ISelectedItem,
  region: IRegion,
): IBuildingPreview | undefined {
  const paint = checkColorPaint({
    colors,
    currentItems,
    date,
    farmMap,
    region,
  });
  const change = paint?.change;

  return paint === undefined
    ? undefined
    : {
        buildings:
          change?.type === "building"
            ? change.buildings
            : (currentItems.currentBuildings ?? []),
        check: paint.check,
        ...(change?.type === "house"
          ? { houseColorPaints: change.houseColorPaints }
          : {}),
        refusal: paint.refusal,
      };
}

function getFixedPreview(
  { currentItems, date, farmMap }: IPreviewState,
  item: IFixedUpgradeItem,
  region: IRegion,
): IBuildingPreview | undefined {
  const order = checkFixedOrder({ currentItems, date, farmMap, item, region });

  return order === undefined
    ? undefined
    : {
        buildings: currentItems.currentBuildings ?? [],
        check: order.check,
        refusal: order.refusal,
      };
}

// The sprite and the tiles of the preview share 1 check, because the check
// reads the tiles on each day from the date, which is too slow to do 2 times
// in each frame.
export function getBuildingPreview(
  state: IPreviewState,
): IBuildingPreview | undefined {
  const { highlightedRegion, selectedItem } = state;

  if (highlightedRegion !== undefined && isFixedUpgradeItem(selectedItem)) {
    return getFixedPreview(state, selectedItem, highlightedRegion);
  }

  if (highlightedRegion !== undefined && selectedItem?.type === "paint") {
    return getColorPaintPreview(state, selectedItem, highlightedRegion);
  }

  if (highlightedRegion === undefined || selectedItem?.type !== "building") {
    return undefined;
  }

  const request = toOrderRequest(state, selectedItem, highlightedRegion);
  const paintPreview = getPaintPreview(state, request);

  if (paintPreview !== undefined) {
    return paintPreview;
  }

  const order = checkBuildingOrder(request);
  const isAllowed = order.refusal === undefined;
  const { click } = order;

  return {
    buildings:
      isAllowed && click.type === "upgrade" ? order.after : order.before,
    check: order.check,
    newBuilding:
      isAllowed && click.type === "new" ? click.plannedBuilding : undefined,
    refusal: order.refusal,
  };
}

// Only a new building can fit on a later day, so only it gets a next good
// day, and a building that has the picked look already changes only with a
// paint.
function findNextDate(
  state: IPreviewState,
  region: IRegion,
): number | undefined {
  const { selectedItem } = state;

  if (selectedItem?.type !== "building") {
    return undefined;
  }

  const request = toOrderRequest(state, selectedItem, region);

  return checkPaint(request) === undefined
    ? findNextOrderDate(request)
    : undefined;
}

// preview is the building preview of the same state, when the caller has it.
export function getPlanNotice(
  state: IPreviewState,
  preview = getBuildingPreview(state),
): IPlanNotice | undefined {
  const { date, highlightedRegion } = state;
  const refusal = preview?.refusal;

  if (highlightedRegion === undefined || refusal === undefined) {
    return undefined;
  }

  const nextDate = findNextDate(state, highlightedRegion);

  return {
    lines: [
      describeRefusal(refusal, date),
      ...(nextDate === undefined ? [] : [describeNextGoodDate(nextDate, date)]),
    ],
    tile: { x: highlightedRegion.x1, y: highlightedRegion.y1 },
  };
}
