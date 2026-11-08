import { buildings } from "../data/game/buildings.json";
import { getTierOn } from "./buildingTiers";
import { getBuildingsOn } from "./plannedBuildings";

// SV › GameStateQuery.CAN_BUILD_CABIN: fewer cabins than CurrentPlayerLimit - 1,
// and the player limit is 8.
export const cabinLimit = 7;

// cabins: the cabin limit. perCabin: 1 more than the number of cabins
// (SV › GameStateQuery.CAN_BUILD_FOR_CABINS).
export type TBuildLimit = "cabins" | "perCabin";

export interface ILimitBreak {
  buildingId: string;
  limit: TBuildLimit;
}

interface ILimitRule {
  countedId: string;
  limit: TBuildLimit;
}

const plannerIdByType: ReadonlyMap<string, string> = new Map(
  Object.entries(buildings).map(([buildingId, building]) => [
    building.buildingId,
    buildingId,
  ]),
);

const cabinId = plannerIdByType.get("Cabin") ?? "cabin";

function getLimitRule(buildingId: string): ILimitRule | undefined {
  const [query, type] = buildings[buildingId].buildCondition?.split(" ") ?? [];
  const countedId = type === undefined ? undefined : plannerIdByType.get(type);

  if (query === "CAN_BUILD_CABIN") {
    return { countedId: cabinId, limit: "cabins" };
  }

  return query === "CAN_BUILD_FOR_CABINS" && countedId !== undefined
    ? { countedId, limit: "perCabin" }
    : undefined;
}

export function getBuildLimit(buildingId: string) {
  return getLimitRule(buildingId)?.limit;
}

const isTierOn = (
  plannedBuilding: IPlannedBuilding,
  buildingId: string,
  date: number,
) => getTierOn(plannedBuilding, date).buildingId === buildingId;

// A building is there from the date it goes down, so each building on the
// date counts. On 1 day the player can demolish before an order, so the
// buildings that go on the date do not count.
function countOn(
  plannedBuildings: readonly IPlannedBuilding[],
  buildingId: string,
  date: number,
  order?: IPlannedBuilding,
) {
  return getBuildingsOn(plannedBuildings, date).filter(
    (plannedBuilding) =>
      plannedBuilding !== order && isTierOn(plannedBuilding, buildingId, date),
  ).length;
}

// The player can order a Stable before a cabin goes on the same day.
function countCabinsDuring(
  plannedBuildings: readonly IPlannedBuilding[],
  date: number,
) {
  return plannedBuildings.filter(
    (plannedBuilding) =>
      plannedBuilding.datePlaced <= date &&
      (plannedBuilding.dateDestroyed === undefined ||
        plannedBuilding.dateDestroyed >= date) &&
      isTierOn(plannedBuilding, cabinId, date),
  ).length;
}

// The cabins on the date include the new cabin and the other cabins that go
// down on that date.
function breaksLimit(
  order: IPlannedBuilding,
  { countedId, limit }: ILimitRule,
  plannedBuildings: readonly IPlannedBuilding[],
) {
  const date = order.datePlaced;

  if (limit === "cabins") {
    return countOn(plannedBuildings, countedId, date) > cabinLimit;
  }

  return (
    countOn(plannedBuildings, countedId, date, order) >=
    countCabinsDuring(plannedBuildings, date) + 1
  );
}

const orderKey = ({ buildingId, datePlaced, x, y }: IPlannedBuilding) =>
  `${buildingId} ${x},${y} ${datePlaced}`;

function findLimitBreaks(plannedBuildings: readonly IPlannedBuilding[]) {
  return plannedBuildings.flatMap((order): [IPlannedBuilding, ILimitRule][] => {
    const rule = getLimitRule(order.buildingId);

    return rule !== undefined && breaksLimit(order, rule, plannedBuildings)
      ? [[order, rule]]
      : [];
  });
}

// The game checks a limit when the player builds, so a plan breaks a limit
// when one of its buildings could not go down on its date. A building that
// broke a limit before the change, such as after an erase, does not stop the
// change.
export function findNewLimitBreak(
  before: readonly IPlannedBuilding[],
  after: readonly IPlannedBuilding[],
): ILimitBreak | undefined {
  const brokenBefore = new Set(
    findLimitBreaks(before).map(([order]) => orderKey(order)),
  );
  const newBreak = findLimitBreaks(after).find(
    ([order]) => !brokenBefore.has(orderKey(order)),
  );

  return newBreak === undefined
    ? undefined
    : { buildingId: newBreak[0].buildingId, limit: newBreak[1].limit };
}
