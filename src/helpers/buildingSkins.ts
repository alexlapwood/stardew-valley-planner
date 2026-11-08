import { buildings } from "../data/game/buildings.json";

interface IPainted {
  buildingId: string;
  paints?: readonly IPlannedPaint[];
  skin?: string;
}

// The game lists the look with no skin first (SV › BuildingSkinMenu).
export function getSkinKeys(buildingId: string) {
  const skins = Object.hasOwn(buildings, buildingId)
    ? buildings[buildingId].skins
    : undefined;

  return skins === undefined ? [] : [buildingId, ...Object.keys(skins)];
}

export function hasSkins(buildingId: string) {
  return getSkinKeys(buildingId).length > 0;
}

export function isSkinOf(buildingId: string, skin: string) {
  return getSkinKeys(buildingId).includes(skin);
}

export function getSkinName(buildingId: string, skin: string) {
  const building = buildings[buildingId];

  return building.skins?.[skin]?.name ?? building.name;
}

// The game's arrows go round the list (SV › BuildingSkinMenu.SetSkin).
export function stepSkin(buildingId: string, skin: string, step: number) {
  const keys = getSkinKeys(buildingId);
  const index = Math.max(keys.indexOf(skin), 0);

  return keys.at((index + step) % keys.length) ?? skin;
}

export function getOrderSkin({ buildingId, skin }: IPainted) {
  return skin ?? buildingId;
}

export function getSkinOn(painted: IPainted, date: number) {
  return (
    painted.paints?.findLast(({ datePainted }) => datePainted <= date)?.skin ??
    getOrderSkin(painted)
  );
}

// With no look key, the building draws its own sprite, which is the look with
// no skin.
export function getLookKeyOn(painted: IPainted, date: number) {
  const skin = getSkinOn(painted, date);

  return skin === painted.buildingId ? undefined : skin;
}

// A paint that keeps the look that the building has changes nothing.
function keepChanges(paints: readonly IPlannedPaint[], startSkin: string) {
  let skin = startSkin;

  return paints.filter((paint) => {
    const isChange = paint.skin !== skin;
    skin = paint.skin;

    return isChange;
  });
}

export function withPaints(
  plannedBuilding: IPlannedBuilding,
  paints: IPlannedPaint[],
): IPlannedBuilding {
  const { paints: _paints, ...rest } = plannedBuilding;

  return paints.length === 0 ? rest : { ...rest, paints };
}

// A skin that the building does not have, such as a skin picked for the row
// of a higher tier, leaves the look with no skin.
export function withSkin(
  plannedBuilding: IPlannedBuilding,
  skin: string | undefined,
): IPlannedBuilding {
  const { skin: _skin, ...rest } = plannedBuilding;
  const { buildingId } = plannedBuilding;

  return skin === undefined ||
    skin === buildingId ||
    !isSkinOf(buildingId, skin)
    ? rest
    : { ...rest, skin };
}

// A paint takes the place of a paint on the same day, and the later paints
// stay as the next changes of look.
export function paintOn(
  paints: readonly IPlannedPaint[],
  startSkin: string,
  date: number,
  skin: string,
) {
  return keepChanges(
    [
      ...paints.filter(({ datePainted }) => datePainted !== date),
      { datePainted: date, skin },
    ].toSorted((a, b) => a.datePainted - b.datePainted),
    startSkin,
  );
}

// A paint on the order day is the same as the skin picked for the order.
export function paintBuilding(
  plannedBuilding: IPlannedBuilding,
  date: number,
  skin: string,
) {
  const paints = plannedBuilding.paints ?? [];

  if (date === plannedBuilding.datePlaced) {
    return withPaints(
      withSkin(plannedBuilding, skin),
      keepChanges(paints, skin),
    );
  }

  return withPaints(
    plannedBuilding,
    paintOn(paints, getOrderSkin(plannedBuilding), date, skin),
  );
}

// A demolished building has no looks and no colours after it goes.
export function keepPaintsBefore(
  plannedBuilding: IPlannedBuilding,
  date: number,
): IPlannedBuilding {
  const isBefore = ({ datePainted }: { datePainted: number }) =>
    datePainted < date;
  const { colorPaints: _colorPaints, ...withoutColors } = withPaints(
    plannedBuilding,
    (plannedBuilding.paints ?? []).filter(isBefore),
  );
  const colorPaints = (plannedBuilding.colorPaints ?? []).filter(isBefore);

  return colorPaints.length === 0
    ? withoutColors
    : { ...withoutColors, colorPaints };
}

// Each paint comes after the one before it, on a day that the building
// stands.
export function isGoodPaint(
  { datePainted, skin }: IPlannedPaint,
  buildingId: string,
  earliestDate: number,
  dateDestroyed?: number,
) {
  return (
    isSkinOf(buildingId, skin) &&
    Number.isInteger(datePainted) &&
    datePainted >= earliestDate &&
    (dateDestroyed === undefined || datePainted < dateDestroyed)
  );
}
