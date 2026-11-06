import { getDragTiles, placeAlongDrag, squareAround } from "./dragPlacement";

const tiles = (region: Parameters<typeof getDragTiles>[0]) =>
  getDragTiles(region).map(({ x, y }) => [x, y]);

describe("getDragTiles", () => {
  it("goes row by row from the tile where the drag started", () => {
    expect(tiles({ x1: 1, x2: 0, y1: 1, y2: 0 })).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(tiles({ x1: 0, x2: 1, y1: 0, y2: 1 })).toEqual([
      [1, 1],
      [0, 1],
      [1, 0],
      [0, 0],
    ]);
  });

  it("gives one tile for a click", () => {
    expect(tiles({ x1: 4, x2: 4, y1: 2, y2: 2 })).toEqual([[4, 2]]);
  });

  it("gives no tiles for a region with no numbers", () => {
    expect(tiles({ x1: NaN, x2: 0, y1: 0, y2: 0 })).toEqual([]);
  });
});

describe("placeAlongDrag", () => {
  it("lets a rule find the things that the drag placed before, by tile", () => {
    const row = [0, 1, 2, 3, 4].map((x) => ({ id: `thing ${x}`, x, y: 0 }));
    const { placed, refused } = placeAlongDrag(
      row,
      ({ x, y }, placedInDrag) => placedInDrag.at(x - 1, y) === undefined,
    );

    expect(placed.map(({ x }) => x)).toEqual([0, 2, 4]);
    expect(refused.map(({ x }) => x)).toEqual([1, 3]);
  });

  it("gives a rule the placed thing itself", () => {
    const things = [
      { id: "first", x: 0, y: 0 },
      { id: "second", x: 1, y: 0 },
    ];
    const found: unknown[] = [];

    placeAlongDrag(things, (_, placedInDrag) => {
      found.push(placedInDrag.at(0, 0));

      return true;
    });

    expect(found).toEqual([undefined, things[0]]);
  });
});

describe("squareAround", () => {
  it("gives the region of the square around a tile", () => {
    expect(squareAround({ x: 5, y: 6 }, 1)).toEqual({
      x1: 4,
      x2: 6,
      y1: 5,
      y2: 7,
    });
  });
});
