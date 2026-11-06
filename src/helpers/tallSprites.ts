import type { IDragRegion } from "./dragPlacement";
import type { ISortedDraw } from "./renderSorted";

export interface IPixelRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

// A tall sprite stands on its base tiles and draws over the tiles above and
// beside them. The base tiles never fade the sprite. The base of a building is
// its footprint. The base of a tree is its whole trunk row, because the game
// fades a tree only for the leaves above its trunk.
export interface ITallSprite {
  base: IFarmSpot;
  drawn: IPixelRect;
}

// Inclusive tile bounds, with x1 <= x2 and y1 <= y2.
interface ITileArea {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

const tileSize = 16;

export const fadedAlpha = 0.4;

function getBaseArea({ height, width, x, y }: IFarmSpot): ITileArea {
  return { x1: x, x2: x + width - 1, y1: y, y2: y + height - 1 };
}

// A tile is under the sprite when the sprite covers the middle of the tile.
// The edge of a sprite can go a few pixels into a tile, such as the farmhouse
// into the tile in front of its door, and that tile does not count.
function firstTile(start: number) {
  return Math.ceil((start - tileSize / 2) / tileSize);
}

function lastTile(end: number) {
  return Math.ceil((end - tileSize / 2) / tileSize) - 1;
}

function getDrawnArea({ height, width, x, y }: IPixelRect): ITileArea {
  return {
    x1: firstTile(x),
    x2: lastTile(x + width),
    y1: firstTile(y),
    y2: lastTile(y + height),
  };
}

export function getTreeTallSprite(
  trunkRow: number,
  drawn: IPixelRect,
): ITallSprite {
  const { x1, x2 } = getDrawnArea(drawn);

  return { base: { height: 1, width: x2 - x1 + 1, x: x1, y: trunkRow }, drawn };
}

function getRegionArea({ x1, x2, y1, y2 }: IDragRegion): ITileArea {
  return {
    x1: Math.min(x1, x2),
    x2: Math.max(x1, x2),
    y1: Math.min(y1, y2),
    y2: Math.max(y1, y2),
  };
}

function getOverlap(a: ITileArea, b: ITileArea): ITileArea | undefined {
  const overlap = {
    x1: Math.max(a.x1, b.x1),
    x2: Math.min(a.x2, b.x2),
    y1: Math.max(a.y1, b.y1),
    y2: Math.min(a.y2, b.y2),
  };

  return overlap.x1 <= overlap.x2 && overlap.y1 <= overlap.y2
    ? overlap
    : undefined;
}

function contains(outer: ITileArea, inner: ITileArea) {
  return (
    inner.x1 >= outer.x1 &&
    inner.x2 <= outer.x2 &&
    inner.y1 >= outer.y1 &&
    inner.y2 <= outer.y2
  );
}

// The sprite fades when a tile of the region is under the sprite and is not a
// base tile. The tiles of the region that the sprite covers are a rectangle,
// so the test needs no loop over the tiles.
export function isTallSpriteFaded(
  { base, drawn }: ITallSprite,
  region: IDragRegion | undefined,
) {
  if (region === undefined) {
    return false;
  }

  const covered = getOverlap(getRegionArea(region), getDrawnArea(drawn));

  return covered !== undefined && !contains(getBaseArea(base), covered);
}

function drawFaded(context: CanvasRenderingContext2D, draw: () => void) {
  const { globalAlpha } = context;

  context.globalAlpha = globalAlpha * fadedAlpha;
  draw();
  context.globalAlpha = globalAlpha;
}

export function fadeTallSprites(
  context: CanvasRenderingContext2D,
  draws: readonly ISortedDraw[],
  region: IDragRegion | undefined,
): readonly ISortedDraw[] {
  if (region === undefined) {
    return draws;
  }

  return draws.map((sortedDraw) => {
    const { draw, tall } = sortedDraw;

    return tall !== undefined && isTallSpriteFaded(tall, region)
      ? {
          ...sortedDraw,
          draw: () => {
            drawFaded(context, draw);
          },
        }
      : sortedDraw;
  });
}
