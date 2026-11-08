import { buildings } from "../data/game/buildings.json";
import { keepPaintsBefore } from "./buildingSkins";
import { type IDaySpan, isOverlapping } from "./daySpan";

export interface IBuildingTier {
  buildingId: string;
  datePlaced: number;
}

interface ITierSpan {
  days: IDaySpan;
  tier: IBuildingTier;
}

type TOrder = Pick<IPlannedBuilding, "buildingId" | "datePlaced">;

type TTiered = TOrder & Pick<IPlannedBuilding, "dateDestroyed" | "upgrades">;

export function isUpgradeTier(buildingId: string) {
  return buildings[buildingId].upgradeFrom !== undefined;
}

export function getBaseBuildingId(buildingId: string): string {
  const { upgradeFrom } = buildings[buildingId];

  return upgradeFrom === undefined
    ? buildingId
    : getBaseBuildingId(upgradeFrom);
}

// The tiers above fromId, up to and with toId, or undefined when toId is not
// above fromId.
export function getUpgradePath(fromId: string, toId: string) {
  const path: string[] = [];
  let tierId: string | undefined = toId;

  while (tierId !== undefined && tierId !== fromId) {
    path.unshift(tierId);
    tierId = buildings[tierId].upgradeFrom;
  }

  return tierId === fromId && path.length > 0 ? path : undefined;
}

export function getTiers(plannedBuilding: TTiered): IBuildingTier[] {
  const { buildingId, datePlaced, upgrades = [] } = plannedBuilding;

  return [{ buildingId, datePlaced }, ...upgrades];
}

export function getTopBuildingId({ buildingId, upgrades }: TTiered) {
  return upgrades?.at(-1)?.buildingId ?? buildingId;
}

// A tier stands from its date until the date of the next tier, so a tier that
// the next tier follows on the same date stands on no day.
function getTierSpans(plannedBuilding: TTiered): ITierSpan[] {
  const tiers = getTiers(plannedBuilding);

  return tiers.map((tier, index) => {
    const end = tiers[index + 1]?.datePlaced ?? plannedBuilding.dateDestroyed;

    return {
      days: {
        firstDay: tier.datePlaced,
        lastDay: end === undefined ? undefined : end - 1,
      },
      tier,
    };
  });
}

export function getTierOn(plannedBuilding: TTiered, date: number) {
  const tiers = getTiers(plannedBuilding);

  return tiers.findLast(({ datePlaced }) => datePlaced <= date) ?? tiers[0];
}

export function getTiersOver(plannedBuilding: TTiered, days: IDaySpan) {
  return getTierSpans(plannedBuilding)
    .filter((span) => isOverlapping(span.days, days))
    .map(({ tier }) => tier);
}

export function chainUpgrades(
  upgradeIds: readonly string[],
  date: number,
): IPlannedUpgrade[] {
  return upgradeIds.map((buildingId) => ({ buildingId, datePlaced: date }));
}

// A higher tier on empty ground is the lowest tier with each upgrade up to it,
// all on the same date, so that the plan keeps the cost of each tier.
export function orderChain(
  buildingId: string,
  date: number,
): TOrder & Pick<IPlannedBuilding, "upgrades"> {
  const first = {
    buildingId: getBaseBuildingId(buildingId),
    datePlaced: date,
  };
  const path = getUpgradePath(first.buildingId, buildingId);

  return path === undefined
    ? first
    : { ...first, upgrades: chainUpgrades(path, date) };
}

function withUpgrades(
  plannedBuilding: IPlannedBuilding,
  upgrades: IPlannedUpgrade[],
): IPlannedBuilding {
  const { upgrades: _upgrades, ...rest } = plannedBuilding;

  return upgrades.length === 0 ? rest : { ...rest, upgrades };
}

// Each upgrade is the next tier, on a day that the building stands.
export function findBadUpgrade(plannedBuilding: TTiered) {
  const { dateDestroyed, upgrades = [] } = plannedBuilding;
  let tier: IBuildingTier = plannedBuilding;

  return upgrades.findIndex((upgrade) => {
    const isGood =
      buildings[upgrade.buildingId].upgradeFrom === tier.buildingId &&
      upgrade.datePlaced >= tier.datePlaced &&
      (dateDestroyed === undefined || upgrade.datePlaced < dateDestroyed);
    tier = upgrade;

    return !isGood;
  });
}

// A new upgrade on a date takes the place of the upgrades that were planned
// after that date. Undefined: the tier is not above the building on the date.
export function orderUpgrade(
  plannedBuilding: IPlannedBuilding,
  upgradeId: string,
  date: number,
): IPlannedBuilding | undefined {
  const path = getUpgradePath(
    getTierOn(plannedBuilding, date).buildingId,
    upgradeId,
  );

  return path === undefined
    ? undefined
    : withUpgrades(plannedBuilding, [
        ...(plannedBuilding.upgrades ?? []).filter(
          ({ datePlaced }) => datePlaced <= date,
        ),
        ...chainUpgrades(path, date),
      ]);
}

// An erase on the date of the building takes it out of the plan, and an erase
// on the date of an upgrade takes back that upgrade and the later ones. An
// erase on another day demolishes the building from that day. Undefined: the
// whole building goes.
export function eraseBuildingOn(
  plannedBuilding: IPlannedBuilding,
  date: number,
): IPlannedBuilding | undefined {
  if (date === plannedBuilding.datePlaced) {
    return undefined;
  }

  const upgrades = plannedBuilding.upgrades ?? [];
  const earlierUpgrades = upgrades.filter(
    ({ datePlaced }) => datePlaced < date,
  );

  if (upgrades.some(({ datePlaced }) => datePlaced === date)) {
    return withUpgrades(plannedBuilding, earlierUpgrades);
  }

  return withUpgrades(
    keepPaintsBefore({ ...plannedBuilding, dateDestroyed: date }, date),
    earlierUpgrades,
  );
}
