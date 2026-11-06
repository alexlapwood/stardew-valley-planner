import type { ITallSprite } from "./tallSprites";

export type TSortedLayer = "building" | "front" | "item";

export interface ISortedDraw {
  draw: () => void;
  layer: TSortedLayer;
  row: number;
  tall?: ITallSprite;
}

// The game sorts a Front tile as if it were one row lower, under the sprites of
// that lower row. So in one row the sprites go first and the Front tiles last:
// a Front tile covers the sprites of its own row, and the sprites of the next
// row cover it. A building sorts by its bottom row, over the items in that row
// (SV › Building.draw).
const layerOrder: Record<TSortedLayer, number> = {
  building: 1,
  front: 2,
  item: 0,
};

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
