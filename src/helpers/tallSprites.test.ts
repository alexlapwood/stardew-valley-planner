import { testFarmMap } from "../__mocks__/testFarmMap";
import { getDefaultBuildingDraws } from "./defaultBuildings";
import type { ISortedDraw } from "./renderSorted";
import {
  fadedAlpha,
  fadeTallSprites,
  getTreeTallSprite,
  isTallSpriteFaded,
  type ITallSprite,
} from "./tallSprites";

// A mature fruit tree on tile 10, 10: 3 tiles wide and 5 tall, over the rows
// above its trunk.
const fruitTree = getTreeTallSprite(10, {
  height: 80,
  width: 48,
  x: 9 * 16,
  y: 6 * 16,
});

const cursorOn = (x: number, y: number) => ({ x1: x, x2: x, y1: y, y2: y });

function reachingUp(pixels: number): ITallSprite {
  return {
    base: { height: 1, width: 1, x: 3, y: 3 },
    drawn: { height: 16 + pixels, width: 16, x: 3 * 16, y: 3 * 16 - pixels },
  };
}

const [farmhouse, greenhouse, petBowl, shippingBin] = getDefaultBuildingDraws(
  {} as CanvasRenderingContext2D,
  document.createElement("canvas"),
  testFarmMap,
  "spring",
  { greenhouse: "broken", house: "upgrade_0", petBowl: "pet_bowl" },
);

function isBuildingFaded(draw: ISortedDraw, x: number, y: number) {
  return isTallSpriteFaded(draw.tall as ITallSprite, cursorOn(x, y));
}

function recordAlpha() {
  const context = { globalAlpha: 1 } as CanvasRenderingContext2D;
  const alphas: Record<string, number> = {};
  const draw = (name: string, tall?: ITallSprite): ISortedDraw => ({
    draw: () => {
      alphas[name] = context.globalAlpha;
    },
    layer: "item",
    row: 10,
    tall,
  });

  return { alphas, context, draw };
}

describe("getTreeTallSprite", () => {
  it("makes the whole trunk row under the sprite the base", () => {
    expect(fruitTree.base).toEqual({ height: 1, width: 3, x: 9, y: 10 });
  });
});

describe("isTallSpriteFaded", () => {
  it.each([
    ["on the leaves above the trunk", 10, 8],
    ["on the top-left of the crown", 9, 6],
    ["on the top-right of the crown", 11, 6],
    ["on the left of the row above the trunk", 9, 9],
    ["on the right of the row above the trunk", 11, 9],
  ])("fades a tree with the cursor %s", (_, x, y) => {
    expect(isTallSpriteFaded(fruitTree, cursorOn(x, y))).toBe(true);
  });

  it.each([
    ["on its trunk", 10, 10],
    ["left of the trunk, under the crown", 9, 10],
    ["right of the trunk, under the crown", 11, 10],
    ["above the crown", 10, 5],
    ["below the trunk", 10, 11],
    ["left of the crown", 8, 8],
    ["right of the crown", 12, 8],
  ])("does not fade a tree with the cursor %s", (_, x, y) => {
    expect(isTallSpriteFaded(fruitTree, cursorOn(x, y))).toBe(false);
  });

  it("does not fade with no cursor", () => {
    expect(isTallSpriteFaded(fruitTree, undefined)).toBe(false);
  });

  it("fades a tree when a tile of the drag is on the leaves, also when the drag covers the trunk", () => {
    expect(
      isTallSpriteFaded(fruitTree, { x1: 10, x2: 10, y1: 12, y2: 9 }),
    ).toBe(true);
    expect(isTallSpriteFaded(fruitTree, { x1: 0, x2: 30, y1: 0, y2: 30 })).toBe(
      true,
    );
  });

  it("does not fade a tree when the drag covers only its trunk under the sprite", () => {
    expect(
      isTallSpriteFaded(fruitTree, { x1: 10, x2: 10, y1: 10, y2: 14 }),
    ).toBe(false);
  });

  it("does not fade a tree when the drag covers only its trunk row", () => {
    expect(
      isTallSpriteFaded(fruitTree, { x1: 4, x2: 16, y1: 10, y2: 10 }),
    ).toBe(false);
  });

  it("counts a tile only when the sprite covers the middle of the tile", () => {
    expect(isTallSpriteFaded(reachingUp(8), cursorOn(3, 2))).toBe(true);
    expect(isTallSpriteFaded(reachingUp(7), cursorOn(3, 2))).toBe(false);
    expect(isTallSpriteFaded(reachingUp(8), cursorOn(3, 1))).toBe(false);
  });

  describe("on the fixed buildings", () => {
    const { farmhouse: spot } = testFarmMap.spots;

    it("draws the farmhouse over the rows above its footprint", () => {
      expect(farmhouse.tall?.base).toEqual(spot);
      expect(farmhouse.tall?.drawn.y).toBeLessThan(spot.y * 16);
    });

    it("fades the farmhouse with the cursor on its roof above the footprint", () => {
      expect(isBuildingFaded(farmhouse, spot.x + 4, spot.y - 1)).toBe(true);
    });

    it("fades the farmhouse with the cursor beside its footprint, under the side of its sprite", () => {
      expect(
        isBuildingFaded(farmhouse, spot.x - 1, spot.y + spot.height - 1),
      ).toBe(true);
    });

    it("does not fade the farmhouse with the cursor on its footprint", () => {
      expect(
        isBuildingFaded(farmhouse, spot.x + 4, spot.y + spot.height - 1),
      ).toBe(false);
    });

    it("does not fade the farmhouse with the cursor in front of its door, where its sprite goes 2 pixels into the tile", () => {
      expect(isBuildingFaded(farmhouse, spot.x + 5, spot.y + spot.height)).toBe(
        false,
      );
    });

    it("fades the greenhouse and the shipping bin above their footprints, and never the pet bowl", () => {
      const {
        greenhouse: greenhouseSpot,
        petBowl: petBowlSpot,
        shippingBin: binSpot,
      } = testFarmMap.spots;

      expect(
        isBuildingFaded(greenhouse, greenhouseSpot.x, greenhouseSpot.y - 1),
      ).toBe(true);
      expect(isBuildingFaded(shippingBin, binSpot.x, binSpot.y - 1)).toBe(true);
      expect(
        [-1, 0, 1, 2].flatMap((dy) =>
          [-1, 0, 1, 2].map((dx) =>
            isBuildingFaded(petBowl, petBowlSpot.x + dx, petBowlSpot.y + dy),
          ),
        ),
      ).not.toContain(true);
    });
  });
});

describe("fadeTallSprites", () => {
  it("draws a faded sprite at the faded alpha, and puts the alpha back for the next draws", () => {
    const { alphas, context, draw } = recordAlpha();

    fadeTallSprites(
      context,
      [draw("crop"), draw("tree", fruitTree), draw("after")],
      cursorOn(10, 8),
    ).forEach((sortedDraw) => {
      sortedDraw.draw();
    });

    expect(alphas).toEqual({ after: 1, crop: 1, tree: fadedAlpha });
    expect(context.globalAlpha).toBe(1);
  });

  it("keeps the draws when there is no cursor", () => {
    const { context, draw } = recordAlpha();
    const draws = [draw("tree", fruitTree)];

    expect(fadeTallSprites(context, draws, undefined)).toBe(draws);
  });

  it("uses the sprite's own faded draw when it has one, and the plain draw when it is not faded", () => {
    const { context, draw } = recordAlpha();
    const calls: string[] = [];
    const ownFade = {
      ...draw("tree", fruitTree),
      draw: () => {
        calls.push("draw");
      },
      fadedDraw: () => {
        calls.push("fadedDraw");
      },
    };

    fadeTallSprites(context, [ownFade], cursorOn(10, 8))[0].draw();
    fadeTallSprites(context, [ownFade], cursorOn(30, 30))[0].draw();

    expect(calls).toEqual(["fadedDraw", "draw"]);
    expect(context.globalAlpha).toBe(1);
  });

  it("keeps the sort place of a faded sprite", () => {
    const { context, draw } = recordAlpha();
    const [faded] = fadeTallSprites(
      context,
      [draw("tree", fruitTree)],
      cursorOn(10, 8),
    );

    expect(faded).toMatchObject({ layer: "item", row: 10, tall: fruitTree });
  });
});
