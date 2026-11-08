import { bushes } from "../data/game/bushes.json";
import { type IDaySpan, isOnDay, isOverlapping } from "./daySpan";
import { isOnMap } from "./farmMap";

export function getBushKind({ size }: Pick<IFarmBush, "size">): IBush {
  return bushes[size];
}

export function getBushFootprint(bush: IFarmBush): IFarmSpot {
  return { height: 1, width: getBushKind(bush).width, x: bush.x, y: bush.y };
}

export function getBushTiles(bush: IFarmBush) {
  return Array.from(
    { length: getBushKind(bush).width },
    (_, dx): IFarmTile => ({ x: bush.x + dx, y: bush.y }),
  );
}

const bushCellsByMap = new WeakMap<
  IFarmMap,
  { bushes: readonly IFarmBush[]; cells: Map<number, IFarmBush> }
>();

function getBushCells(map: IFarmMap) {
  const cached = bushCellsByMap.get(map);

  if (cached?.bushes === map.bushes) {
    return cached.cells;
  }

  const cells = new Map<number, IFarmBush>();

  map.bushes.forEach((bush) => {
    getBushTiles(bush).forEach(({ x, y }) => {
      if (isOnMap(map, x, y)) {
        cells.set(y * map.width + x, bush);
      }
    });
  });
  bushCellsByMap.set(map, { bushes: map.bushes, cells });

  return cells;
}

export function findBushAt(map: IFarmMap, x: number, y: number) {
  return isOnMap(map, x, y)
    ? getBushCells(map).get(y * map.width + x)
    : undefined;
}

export function findCut(cutBushes: readonly ICutBush[], { x, y }: IFarmTile) {
  return cutBushes.find((cut) => cut.x === x && cut.y === y);
}

// The bush is on the farm when the game makes the farm, before the first day.
export function getBushDays(
  bush: IFarmTile,
  cutBushes: readonly ICutBush[] = [],
): IDaySpan {
  const cut = findCut(cutBushes, bush);

  return {
    firstDay: Number.NEGATIVE_INFINITY,
    lastDay: cut === undefined ? undefined : cut.dateCut - 1,
  };
}

export function isBushHereOn(
  bush: IFarmTile,
  cutBushes: readonly ICutBush[] | undefined,
  date: number,
) {
  return isOnDay(getBushDays(bush, cutBushes), date);
}

export function getBushesOn(
  map: IFarmMap,
  cutBushes: readonly ICutBush[] | undefined,
  date: number,
) {
  return map.bushes.filter((bush) => isBushHereOn(bush, cutBushes, date));
}

// The bush on the tile on some of the days.
export function findBushOver(
  map: IFarmMap,
  { x, y }: IFarmTile,
  days: IDaySpan,
  cutBushes?: readonly ICutBush[],
) {
  const bush = findBushAt(map, x, y);

  return bush !== undefined && isOverlapping(getBushDays(bush, cutBushes), days)
    ? bush
    : undefined;
}

export function getBushSprite(bush: IFarmBush, season: string) {
  const { offset, seasons, sprite } = getBushKind(bush).sprite;

  return { offset, rect: seasons?.[season] ?? sprite };
}

function mix(value: number) {
  const hash = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  const mixed = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);

  return mixed ^ (mixed >>> 16);
}

// The game flips each bush at random when it makes the farm (SV › Bush), and
// the plan has no save to read the flip from. A hash of the tile stands in for
// it, so that a bush never flips from one draw to the next.
export function isBushFlipped({ x, y }: IFarmTile) {
  return (mix(mix(x + 0x6d2b79f5) ^ y) & 1) === 1;
}
