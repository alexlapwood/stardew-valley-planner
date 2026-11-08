import {
  cabinLevel,
  getColorsOn,
  getPaintable,
  getPaintableOn,
  hasColors,
  isSameColors,
  paintBuildingColors,
  paintColorsOn,
  type TPaintable,
} from "./buildingColors";
import { footprintCheck } from "./buildingOrders";
import type { IBuildingCheck } from "./buildingPlacement";
import type { TBuildingRefusal } from "./buildingRules";
import { getTierOn } from "./buildingTiers";
import { findDefaultBuildingAt } from "./defaultBuildings";
import type { IDragRegion } from "./dragPlacement";
import {
  farmhouseId,
  getHouseLevelOn,
  getHousePaintable,
} from "./houseUpgrades";
import type { ICurrentItems } from "./itemPlacement";
import { toPaintColors } from "./paintBrush";
import { findBuildingAt, replaceBuilding } from "./plannedBuildings";

// No colors: the paint has no colour in any region.
export interface IColorPaintRequest {
  colors?: TBrushColors;
  currentItems: ICurrentItems;
  date: number;
  farmMap: IFarmMap;
  region: IDragRegion;
}

export type TColorPaintChange =
  | { buildings: readonly IPlannedBuilding[]; type: "building" }
  | { houseColorPaints: IPlannedColorPaint[]; type: "house" };

// change is undefined when the paint is refused.
export interface IColorPaint {
  change?: TColorPaintChange;
  check: IBuildingCheck;
  refusal?: TBuildingRefusal;
}

type TFootprint = Pick<IPlannedBuilding, "buildingId" | "x" | "y">;

// buildingId is the tier on the date, and colors are its colours on the date.
// No paint: the plan has no colours for the building.
interface IColorTarget {
  buildingId: string;
  colors?: TPaintColors;
  footprint: TFootprint;
  paint?: (colors: TPaintColors) => TColorPaintChange;
  paintable: TPaintable;
}

function findPlannedTarget(
  { currentItems, date }: IColorPaintRequest,
  plannedBuilding: IPlannedBuilding,
): IColorTarget {
  const buildingId = getTierOn(plannedBuilding, date).buildingId;
  const plannedBuildings = currentItems.currentBuildings ?? [];

  return {
    buildingId,
    colors: getColorsOn(plannedBuilding, date),
    footprint: plannedBuilding,
    paint: (colors) => ({
      buildings: replaceBuilding(
        plannedBuildings,
        plannedBuilding,
        paintBuildingColors(plannedBuilding, date, colors),
      ),
      type: "building",
    }),
    paintable: getPaintableOn(plannedBuilding, date),
  };
}

function findHouseTarget(
  { currentItems, date }: IColorPaintRequest,
  footprint: TFootprint,
): IColorTarget {
  const colorPaints = currentItems.currentHouseColorPaints ?? [];
  const level = getHouseLevelOn(currentItems.currentHouseUpgrades ?? [], date);

  return {
    buildingId: farmhouseId,
    colors: getColorsOn({ colorPaints }, date),
    footprint,
    paint: (colors) => ({
      houseColorPaints: paintColorsOn(colorPaints, date, colors),
      type: "house",
    }),
    paintable: getHousePaintable(level),
  };
}

// As in the game, the paint goes on the building under the cursor (SV ›
// CarpenterMenu.receiveLeftClick). The greenhouse, the shipping bin and the
// pet bowl have no paint data.
function findColorTarget(
  request: IColorPaintRequest,
): IColorTarget | undefined {
  const { currentItems, date, farmMap, region } = request;
  const tile = { x: region.x1, y: region.y1 };
  const plannedBuilding = findBuildingAt(
    currentItems.currentBuildings ?? [],
    tile,
    date,
  );

  if (plannedBuilding !== undefined) {
    return findPlannedTarget(request, plannedBuilding);
  }

  const fixed = findDefaultBuildingAt(farmMap, tile.x, tile.y);

  if (fixed === undefined) {
    return undefined;
  }

  const { buildingId, spot } = fixed;
  const footprint = { buildingId, x: spot.x, y: spot.y };

  return buildingId === farmhouseId
    ? findHouseTarget(request, footprint)
    : {
        buildingId,
        footprint,
        paintable: getPaintable({ buildingId, houseLevel: cabinLevel }),
      };
}

function refuse(footprint: TFootprint, refusal: TBuildingRefusal): IColorPaint {
  return { check: footprintCheck(footprint, false), refusal };
}

// A paint is free and at once, as a change of skin is. Undefined: the cursor
// is not on a building.
export function checkColorPaint(
  request: IColorPaintRequest,
): IColorPaint | undefined {
  const target = findColorTarget(request);

  if (target === undefined) {
    return undefined;
  }

  const { buildingId, footprint, paint, paintable } = target;

  if (paintable.block !== undefined || paint === undefined) {
    return refuse(footprint, {
      block: paintable.block ?? { type: "none" },
      buildingId,
      type: "unpaintable",
    });
  }

  const colors = toPaintColors(request.colors ?? {}, paintable.paint);

  if (isSameColors(target.colors, colors)) {
    return refuse(footprint, {
      buildingId,
      hasPaint: hasColors(colors),
      type: "colored",
    });
  }

  return { change: paint(colors), check: footprintCheck(footprint, true) };
}
