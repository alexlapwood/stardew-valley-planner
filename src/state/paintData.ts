import { withColorPaints } from "../helpers/buildingColors";
import {
  isGoodPaint,
  isSkinOf,
  withPaints,
  withSkin,
} from "../helpers/buildingSkins";
import { buildingIdBySpot } from "../helpers/defaultBuildings";
import { readColorPaints } from "./colorPaintData";
import type { IBadItem } from "./farmData";

interface IPaintDays {
  dateDestroyed?: number;
  earliestDate: number;
}

function toPaint(value: unknown): IPlannedPaint | undefined {
  return typeof value === "object" &&
    value !== null &&
    "datePainted" in value &&
    typeof value.datePainted === "number" &&
    "skin" in value &&
    typeof value.skin === "string"
    ? { datePainted: value.datePainted, skin: value.skin }
    : undefined;
}

// Each paint is a whole look, so a bad paint drops only itself.
function readPaints(
  value: unknown,
  buildingId: string,
  { dateDestroyed, earliestDate }: IPaintDays,
  path: string,
) {
  const badItems: IBadItem[] = [];
  const paints: IPlannedPaint[] = [];

  if (value !== undefined && !Array.isArray(value)) {
    badItems.push({ path, value });
  }

  const entries: readonly unknown[] = Array.isArray(value) ? value : [];

  entries.forEach((entry, index) => {
    const paint = toPaint(entry);
    const previous = paints.at(-1);
    const isGood =
      paint !== undefined &&
      isGoodPaint(
        paint,
        buildingId,
        previous === undefined ? earliestDate : previous.datePainted + 1,
        dateDestroyed,
      );

    if (isGood) {
      paints.push(paint);
    } else {
      badItems.push({ path: `${path}[${index}]`, value: entry });
    }
  });

  return { badItems, paints };
}

// The fixed pet bowl stands from the first day.
export function readPetBowlPaints(value: unknown) {
  const { badItems, paints } = readPaints(
    value,
    buildingIdBySpot.petBowl,
    { earliestDate: 0 },
    "petBowlPaints",
  );

  return { badItems, petBowlPaints: paints };
}

// A bad skin leaves the look with no skin. A paint on the order day would be
// the skin of the order, so the paints start on the next day. The building is
// ready on the order day, so its colours can start on that day.
export function readBuildingLooks(
  plannedBuilding: IPlannedBuilding,
  path: string,
) {
  const skin: unknown = plannedBuilding.skin;
  const paints: unknown = plannedBuilding.paints;
  const { buildingId, dateDestroyed, datePlaced } = plannedBuilding;
  const goodSkin =
    typeof skin === "string" && isSkinOf(buildingId, skin) ? skin : undefined;
  const read = readPaints(
    paints,
    buildingId,
    { dateDestroyed, earliestDate: datePlaced + 1 },
    `${path}.paints`,
  );
  const colors = readColorPaints(
    plannedBuilding.colorPaints,
    { dateDestroyed, earliestDate: datePlaced },
    `${path}.colorPaints`,
  );

  return {
    badItems: [
      ...(skin !== undefined && goodSkin === undefined
        ? [{ path: `${path}.skin`, value: skin }]
        : []),
      ...read.badItems,
      ...colors.badItems,
    ],
    plannedBuilding: withColorPaints(
      withPaints(withSkin(plannedBuilding, goodSkin), read.paints),
      colors.colorPaints,
    ),
  };
}
