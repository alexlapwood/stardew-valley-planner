import type { ITallSprite } from "./tallSprites";

export type TSortedLayer = "afterRow" | "building" | "front" | "item";

// fadedDraw is the draw of a tall sprite that does its own fade, because some
// of its parts do not fade.
export interface ISortedDraw {
  draw: () => void;
  fadedDraw?: () => void;
  layer: TSortedLayer;
  row: number;
  tall?: ITallSprite;
}

// The game sorts a Front tile as if it were one row lower, under the sprites of
// that lower row. So in one row the sprites go first and the Front tiles last:
// a Front tile covers the sprites of its own row, and the sprites of the next
// row cover it. A building sorts by its bottom row, over the items in that row
// (SV › Building.draw). A sprite that sorts below the bottom line of its row,
// such as a bush, goes after all of its row, also the Front tiles.
const layerOrder: Record<TSortedLayer, number> = {
  afterRow: 3,
  building: 1,
  front: 2,
  item: 0,
};

const tileSize = 16;

// A sprite that sorts sortY pixels below the top of its footprint goes in the
// first row whose bottom line is at or below that depth, as for an item in
// that row.
export function getSortRow(top: number, sortY: number) {
  return top + Math.ceil(sortY / tileSize) - 1;
}

export function sortDraws(draws: readonly ISortedDraw[]) {
  return draws.toSorted(
    (a, b) => a.row - b.row || layerOrder[a.layer] - layerOrder[b.layer],
  );
}

export function renderSortedDraws(draws: readonly ISortedDraw[]) {
  sortDraws(draws).forEach(({ draw }) => {
    draw();
  });
}
