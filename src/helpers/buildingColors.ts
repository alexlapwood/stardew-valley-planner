import { buildings } from "../data/game/buildings.json";
import { getUpgradePath } from "./buildingTiers";
import type { IMaskPaint, IPaintJob } from "./paintedSprites";

// level: the house or the cabin needs that level first. upgradeId: a higher
// tier of the building takes paint.
export type TPaintBlock =
  | { level: number; type: "level" }
  | { type: "none"; upgradeId?: string };

// houseLevel is the level of the farmhouse, or of the cabin.
export interface IPaintTarget {
  buildingId: string;
  houseLevel: number;
  lookKey?: string;
}

export type TPaintable =
  | { block: TPaintBlock; paint?: undefined }
  | { block?: undefined; paint: IBuildingPaint };

interface IColorPainted {
  colorPaints?: readonly IPlannedColorPaint[];
  paints?: readonly IPlannedPaint[];
}

function findLook(building: IBuilding, lookKey: string | undefined) {
  return lookKey === undefined
    ? undefined
    : (building.looks?.[lookKey] ?? building.skins?.[lookKey]);
}

// A skin with its own paint data uses it, because the game looks for the skin
// first (SV › Building.GetPaintDataKey).
export function getPaintData(building: IBuilding, lookKey?: string) {
  return (
    (lookKey === undefined ? undefined : building.skins?.[lookKey]?.paint) ??
    building.paint
  );
}

export function getPaintMask(building: IBuilding, lookKey?: string) {
  return (findLook(building, lookKey)?.sprite ?? building.sprite).paintMask;
}

function canTakePaint(buildingId: string) {
  const building = buildings[buildingId];

  return (
    building.paint !== undefined &&
    building.paint.minHouseLevel === undefined &&
    building.sprite.paintMask !== undefined
  );
}

function findPaintedUpgrade(buildingId: string) {
  return Object.keys(buildings).find(
    (upgradeId) =>
      getUpgradePath(buildingId, upgradeId) !== undefined &&
      canTakePaint(upgradeId),
  );
}

// The game paints only a building that has paint data and a mask, and a house
// or a cabin from its level 2 (SV › Building.CanBePainted).
export function getPaintable({
  buildingId,
  houseLevel,
  lookKey,
}: IPaintTarget): TPaintable {
  const building = buildings[buildingId];
  const paint = getPaintData(building, lookKey);

  if (paint?.minHouseLevel !== undefined && houseLevel < paint.minHouseLevel) {
    return { block: { level: paint.minHouseLevel, type: "level" } };
  }

  if (paint === undefined || getPaintMask(building, lookKey) === undefined) {
    const upgradeId = findPaintedUpgrade(buildingId);

    return {
      block: {
        type: "none",
        ...(upgradeId === undefined ? {} : { upgradeId }),
      },
    };
  }

  return { paint };
}

function isSameColor(a: IPaintColor | undefined, b: IPaintColor | undefined) {
  return a === undefined || b === undefined
    ? a === b
    : a.hue === b.hue &&
        a.lightness === b.lightness &&
        a.saturation === b.saturation;
}

export function isSameColors(a: TPaintColors = {}, b: TPaintColors = {}) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((id) =>
    isSameColor(a[id], b[id]),
  );
}

export function hasColors(colors: TPaintColors | undefined) {
  return (
    colors !== undefined &&
    Object.values(colors).some((color) => color !== undefined)
  );
}

// A change of skin takes the paint off all the regions (SV ›
// BuildingSkinMenu.SetSkin). A colour paint on the day of a skin change came
// after it, because the skin change takes off the colour paints of its day.
export function getColorsOn(
  { colorPaints = [], paints = [] }: IColorPainted,
  date: number,
): TPaintColors | undefined {
  const colorPaint = colorPaints.findLast(
    ({ datePainted }) => datePainted <= date,
  );

  if (colorPaint === undefined) {
    return undefined;
  }

  const isCleared = paints.some(
    ({ datePainted }) =>
      datePainted > colorPaint.datePainted && datePainted <= date,
  );

  return isCleared || !hasColors(colorPaint.colors)
    ? undefined
    : colorPaint.colors;
}

// A colour paint that keeps the colours that the building has changes
// nothing.
function keepColorChanges(
  colorPaints: readonly IPlannedColorPaint[],
  paints?: readonly IPlannedPaint[],
) {
  const kept: IPlannedColorPaint[] = [];

  colorPaints.forEach((colorPaint) => {
    const before = getColorsOn(
      { colorPaints: kept, paints },
      colorPaint.datePainted,
    );

    if (!isSameColors(before, colorPaint.colors)) {
      kept.push(colorPaint);
    }
  });

  return kept;
}

// A colour paint takes the place of a colour paint on the same day, and the
// later colour paints stay.
export function paintColorsOn(
  colorPaints: readonly IPlannedColorPaint[],
  date: number,
  colors: TPaintColors,
  paints?: readonly IPlannedPaint[],
) {
  return keepColorChanges(
    [
      ...colorPaints.filter(({ datePainted }) => datePainted !== date),
      { colors, datePainted: date },
    ].toSorted((a, b) => a.datePainted - b.datePainted),
    paints,
  );
}

export function withColorPaints(
  plannedBuilding: IPlannedBuilding,
  colorPaints: IPlannedColorPaint[],
): IPlannedBuilding {
  const { colorPaints: _colorPaints, ...rest } = plannedBuilding;

  return colorPaints.length === 0 ? rest : { ...rest, colorPaints };
}

export function paintBuildingColors(
  plannedBuilding: IPlannedBuilding,
  date: number,
  colors: TPaintColors,
) {
  return withColorPaints(
    plannedBuilding,
    paintColorsOn(
      plannedBuilding.colorPaints ?? [],
      date,
      colors,
      plannedBuilding.paints,
    ),
  );
}

// A skin change on the date takes off the colour paint of that day.
export function clearColorsOn(plannedBuilding: IPlannedBuilding, date: number) {
  return withColorPaints(
    plannedBuilding,
    keepColorChanges(
      (plannedBuilding.colorPaints ?? []).filter(
        ({ datePainted }) => datePainted !== date,
      ),
      plannedBuilding.paints,
    ),
  );
}

// The shown sprite has the mask of its look. A look with no mask, such as a
// lower house level or tier, shows no paint.
export function getPaintJob(
  building: IBuilding,
  lookKey: string | undefined,
  colors: TPaintColors | undefined,
  offset: IPixelOffset,
): IPaintJob | undefined {
  const paint = getPaintData(building, lookKey);
  const mask = getPaintMask(building, lookKey);

  if (paint === undefined || mask === undefined || colors === undefined) {
    return undefined;
  }

  const regions = paint.regions.flatMap(({ id, maskColor }): IMaskPaint[] => {
    const color = colors[id];

    return color === undefined ? [] : [{ color, maskColor }];
  });

  return regions.length === 0 ? undefined : { mask, offset, regions };
}
