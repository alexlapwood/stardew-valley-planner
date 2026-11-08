import { clearColorsOn } from "./buildingColors";
import { footprintCheck } from "./buildingOrders";
import type { IBuildingCheck } from "./buildingPlacement";
import type { TBuildingRefusal } from "./buildingRules";
import { getSkinOn, hasSkins, paintBuilding, paintOn } from "./buildingSkins";
import { buildingIdBySpot, isInSpot } from "./defaultBuildings";
import type { IDragRegion } from "./dragPlacement";
import type { ICurrentItems } from "./itemPlacement";
import { findBuildingAt, replaceBuilding } from "./plannedBuildings";

// No skin: the look with no skin.
export interface IPaintRequest {
  buildingId: string;
  currentItems: ICurrentItems;
  date: number;
  farmMap: IFarmMap;
  region: IDragRegion;
  skin?: string;
}

export type TPaintChange =
  | { buildings: readonly IPlannedBuilding[]; type: "building" }
  | { petBowlPaints: IPlannedPaint[]; type: "petBowl" };

// change is undefined when the paint is refused.
export interface IPaint {
  change?: TPaintChange;
  check: IBuildingCheck;
  refusal?: TBuildingRefusal;
}

type TPaintTarget =
  | { plannedBuilding: IPlannedBuilding; type: "building" }
  | { spot: IFarmSpot; type: "petBowl" };

const petBowlId = buildingIdBySpot.petBowl;

// As in the game, the paint goes on the building under the cursor (SV ›
// CarpenterMenu.receiveLeftClick).
function findPaintTarget({
  buildingId,
  currentItems,
  date,
  farmMap,
  region,
}: IPaintRequest): TPaintTarget | undefined {
  if (!hasSkins(buildingId)) {
    return undefined;
  }

  const tile = { x: region.x1, y: region.y1 };
  const plannedBuilding = findBuildingAt(
    currentItems.currentBuildings ?? [],
    tile,
    date,
  );

  if (plannedBuilding?.buildingId === buildingId) {
    return { plannedBuilding, type: "building" };
  }

  const spot = farmMap.spots.petBowl;

  return buildingId === petBowlId && isInSpot(spot, tile.x, tile.y)
    ? { spot, type: "petBowl" }
    : undefined;
}

function refuse(
  footprint: Pick<IPlannedBuilding, "buildingId" | "x" | "y">,
): IPaint {
  return {
    check: footprintCheck(footprint, false),
    refusal: { buildingId: footprint.buildingId, type: "painted" },
  };
}

// A paint is free and at once (SV › BuildingSkinMenu.SetSkin), so only the
// look that the building has on the date can stop it. Undefined: the cursor
// is not on a building of the type to paint.
export function checkPaint(request: IPaintRequest): IPaint | undefined {
  const target = findPaintTarget(request);
  const { buildingId, currentItems, date, skin = buildingId } = request;

  if (target?.type === "petBowl") {
    const paints = currentItems.currentPetBowlPaints ?? [];
    const footprint = { buildingId, x: target.spot.x, y: target.spot.y };

    return getSkinOn({ buildingId, paints }, date) === skin
      ? refuse(footprint)
      : {
          change: {
            petBowlPaints: paintOn(paints, buildingId, date, skin),
            type: "petBowl",
          },
          check: footprintCheck(footprint, true),
        };
  }

  if (target === undefined) {
    return undefined;
  }

  const { plannedBuilding } = target;

  return getSkinOn(plannedBuilding, date) === skin
    ? refuse(plannedBuilding)
    : {
        change: {
          buildings: replaceBuilding(
            currentItems.currentBuildings ?? [],
            plannedBuilding,
            clearColorsOn(paintBuilding(plannedBuilding, date, skin), date),
          ),
          type: "building",
        },
        check: footprintCheck(plannedBuilding, true),
      };
}
