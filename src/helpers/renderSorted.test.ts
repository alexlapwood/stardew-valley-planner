import { type ISortedDraw, sortDraws } from "./renderSorted";

function draw(name: string, layer: ISortedDraw["layer"], row: number) {
  return { draw: () => undefined, layer, name, row };
}

function namesOf(draws: readonly ISortedDraw[]) {
  return draws.map((sortedDraw) =>
    "name" in sortedDraw ? sortedDraw.name : undefined,
  );
}

describe("sortDraws", () => {
  it("draws rows from top to bottom", () => {
    expect(
      namesOf(
        sortDraws([
          draw("item row 3", "item", 3),
          draw("front row 1", "front", 1),
          draw("building row 2", "building", 2),
        ]),
      ),
    ).toEqual(["front row 1", "building row 2", "item row 3"]);
  });

  it("puts a Front row over the items of its row and under the items of the next row", () => {
    expect(
      namesOf(
        sortDraws([
          draw("item row 6", "item", 6),
          draw("front row 5", "front", 5),
          draw("item row 5", "item", 5),
        ]),
      ),
    ).toEqual(["item row 5", "front row 5", "item row 6"]);
  });

  it("puts a building over the items of its bottom row and under the Front row there", () => {
    expect(
      namesOf(
        sortDraws([
          draw("front row 4", "front", 4),
          draw("building row 4", "building", 4),
          draw("item row 4", "item", 4),
        ]),
      ),
    ).toEqual(["item row 4", "building row 4", "front row 4"]);
  });

  it("keeps the order of items in one row", () => {
    expect(
      namesOf(
        sortDraws([
          draw("first", "item", 2),
          draw("second", "item", 2),
          draw("third", "item", 2),
        ]),
      ),
    ).toEqual(["first", "second", "third"]);
  });
});
