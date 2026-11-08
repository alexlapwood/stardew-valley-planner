import { brushRanges, paintRegions } from "../helpers/paintBrush";
import type { IBadItem } from "./farmData";

interface IColorPaintDays {
  dateDestroyed?: number;
  earliestDate: number;
}

// The game's sliders: a region with no lightness range in the paint data goes
// from -100 to 100 (SV › BuildingPaintMenu.ColorSliderPanel).
const colorRanges: Record<keyof IPaintColor, IPaintRange> = {
  hue: brushRanges.hue,
  lightness: { max: 100, min: -100 },
  saturation: brushRanges.saturation,
};

const regionIds: ReadonlySet<string> = new Set(
  paintRegions.map(({ id }) => id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWholeIn(value: unknown, { max, min }: IPaintRange): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function toPaintColor(value: unknown): IPaintColor | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { hue, lightness, saturation } = value;

  return isWholeIn(hue, colorRanges.hue) &&
    isWholeIn(lightness, colorRanges.lightness) &&
    isWholeIn(saturation, colorRanges.saturation)
    ? { hue, lightness, saturation }
    : undefined;
}

function toPaintColors(value: unknown): TPaintColors | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).map(
    ([id, color]) => [id, toPaintColor(color)] as const,
  );

  return entries.every(
    ([id, color]) => regionIds.has(id) && color !== undefined,
  )
    ? Object.fromEntries(entries)
    : undefined;
}

function toColorPaint(value: unknown): IPlannedColorPaint | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { colors, datePainted } = value;
  const goodColors = toPaintColors(colors);

  return typeof datePainted === "number" &&
    Number.isInteger(datePainted) &&
    goodColors !== undefined
    ? { colors: goodColors, datePainted }
    : undefined;
}

// Each colour paint has all the regions, so a bad colour paint drops only
// itself.
export function readColorPaints(
  value: unknown,
  { dateDestroyed, earliestDate }: IColorPaintDays,
  path: string,
) {
  const badItems: IBadItem[] = [];
  const colorPaints: IPlannedColorPaint[] = [];

  if (value !== undefined && !Array.isArray(value)) {
    badItems.push({ path, value });
  }

  const entries: readonly unknown[] = Array.isArray(value) ? value : [];

  entries.forEach((entry, index) => {
    const colorPaint = toColorPaint(entry);
    const previous = colorPaints.at(-1);
    const firstDate =
      previous === undefined ? earliestDate : previous.datePainted + 1;
    const isGood =
      colorPaint !== undefined &&
      colorPaint.datePainted >= firstDate &&
      (dateDestroyed === undefined || colorPaint.datePainted < dateDestroyed);

    if (isGood) {
      colorPaints.push(colorPaint);
    } else {
      badItems.push({ path: `${path}[${index}]`, value: entry });
    }
  });

  return { badItems, colorPaints };
}

// The farmhouse stands from the first day.
export function readHouseColorPaints(value: unknown) {
  return readColorPaints(value, { earliestDate: 0 }, "houseColorPaints");
}
