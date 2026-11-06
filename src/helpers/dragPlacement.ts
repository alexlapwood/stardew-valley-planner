// x2, y2 is the tile where the drag started, and x1, y1 the tile under the
// cursor now.
export interface IDragRegion {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface IPlacedInDrag<T> {
  at: (x: number, y: number) => T | undefined;
}

// A rule gets the things that the drag puts down before the candidate, so an
// item can keep a gap to the things of the same drag, as well as to the plan.
export type TDragRule<T> = (
  candidate: T,
  placedInDrag: IPlacedInDrag<T>,
) => boolean;

function stepsFrom(start: number, end: number) {
  const step = end < start ? -1 : 1;

  return Array.from(
    { length: Math.abs(end - start) + 1 },
    (_, index) => start + index * step,
  );
}

// The tiles start at the tile where the drag started, so that the things near
// it stay on their tiles while the drag grows.
export function getDragTiles(region: IDragRegion): IFarmTile[] {
  const { x1, x2, y1, y2 } = region;

  if (![x1, x2, y1, y2].every(Number.isFinite)) {
    return [];
  }

  const columns = stepsFrom(x2, x1);

  return stepsFrom(y2, y1).flatMap((y) => columns.map((x) => ({ x, y })));
}

const tileKey = (x: number, y: number) => `${x},${y}`;

export function placeAlongDrag<T extends IFarmTile>(
  candidates: readonly T[],
  canPlace: TDragRule<T>,
) {
  const placed: T[] = [];
  const refused: T[] = [];
  const placedByTile = new Map<string, T>();
  const placedInDrag: IPlacedInDrag<T> = {
    at: (x, y) => placedByTile.get(tileKey(x, y)),
  };

  candidates.forEach((candidate) => {
    if (canPlace(candidate, placedInDrag)) {
      placed.push(candidate);
      placedByTile.set(tileKey(candidate.x, candidate.y), candidate);
    } else {
      refused.push(candidate);
    }
  });

  return { placed, refused };
}

export function squareAround({ x, y }: IFarmTile, radius: number) {
  return { x1: x - radius, x2: x + radius, y1: y - radius, y2: y + radius };
}
