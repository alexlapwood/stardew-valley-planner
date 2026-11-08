import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { bushes as bushKinds } from "../data/game/bushes.json";
import { isBushFlipped } from "./bushes";
import { decodeFarmMap } from "./farmMap";
import { drawBushShadows, getBushDraws } from "./renderBushes";
import { type ISortedDraw, renderSortedDraws } from "./renderSorted";
import { isTallSpriteFaded } from "./tallSprites";

const image = document.createElement("img");

function makeContext() {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  };
}

function asContext(context: ReturnType<typeof makeContext>) {
  return context as unknown as CanvasRenderingContext2D;
}

function mapWithBushes(bushes: IFarmBush[]) {
  const file = makeTestFarmMapFile();
  file.farm.bushes = bushes;

  return decodeFarmMap("bushes", file);
}

function findTile(flipped: boolean) {
  const x = Array.from({ length: 64 }, (_, index) => index).find(
    (candidate) => isBushFlipped({ x: candidate, y: 30 }) === flipped,
  );

  if (x === undefined) {
    throw new Error("No tile has this flip");
  }

  return { x, y: 30 };
}

const spring = 0;
const winter = 84;

const cursorOn = (x: number, y: number) => ({ x1: x, x2: x, y1: y, y2: y });

function namedDraw(
  order: string[],
  name: string,
  draw: Omit<ISortedDraw, "draw">,
): ISortedDraw {
  return {
    ...draw,
    draw: () => {
      order.push(name);
    },
  };
}

describe("getBushDraws", () => {
  it("draws the look of the season at the offset of the export, with no berries", () => {
    const bush: IFarmBush = {
      destroyable: true,
      size: "medium",
      ...findTile(false),
    };
    const context = makeContext();
    const [draw] = getBushDraws(asContext(context), image, {
      date: winter,
      map: mapWithBushes([bush]),
    });

    draw.draw();

    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(
      image,
      ...(bushKinds.medium.sprite.seasons?.winter ?? []),
      bush.x * 16,
      bush.y * 16 - 32,
      32,
      48,
    );
    expect(context.scale).not.toHaveBeenCalled();
  });

  it("flips a bush by its tile, the same way on each draw", () => {
    const bush: IFarmBush = {
      destroyable: true,
      size: "small",
      ...findTile(true),
    };
    const context = makeContext();
    const scene = { date: spring, map: mapWithBushes([bush]) };

    getBushDraws(asContext(context), image, scene)[0].draw();
    getBushDraws(asContext(context), image, scene)[0].draw();

    expect(context.translate.mock.calls).toEqual([
      [bush.x * 16 + 16, bush.y * 16 - 16],
      [bush.x * 16 + 16, bush.y * 16 - 16],
    ]);
    expect(context.scale.mock.calls).toEqual([
      [-1, 1],
      [-1, 1],
    ]);
  });

  it("does not draw a bush on and after the date of its cut", () => {
    const bush: IFarmBush = { destroyable: true, size: "large", x: 5, y: 9 };
    const map = mapWithBushes([bush]);
    const cutBushes = [{ dateCut: 10, x: 5, y: 9 }];
    const drawsOn = (date: number) =>
      getBushDraws(asContext(makeContext()), image, { cutBushes, date, map });

    expect(drawsOn(9)).toHaveLength(1);
    expect(drawsOn(10)).toEqual([]);
    expect(drawsOn(40)).toEqual([]);
  });

  it("sorts after its whole row, also the Front tiles, and under the next row (sortY 20)", () => {
    const bush: IFarmBush = { destroyable: true, size: "small", x: 5, y: 9 };
    const order: string[] = [];
    const [bushDraw] = getBushDraws(asContext(makeContext()), image, {
      date: spring,
      map: mapWithBushes([bush]),
    });

    renderSortedDraws([
      namedDraw(order, "item below", { layer: "item", row: 10 }),
      namedDraw(order, "bush", bushDraw),
      namedDraw(order, "front", { layer: "front", row: 9 }),
      namedDraw(order, "building", { layer: "building", row: 9 }),
      namedDraw(order, "item", { layer: "item", row: 9 }),
    ]);

    expect(bushKinds.small.sortY).toBe(20);
    expect(order).toEqual(["item", "building", "front", "bush", "item below"]);
  });

  it("fades when the cursor is behind it, and not when it is on its footprint", () => {
    const bush: IFarmBush = { destroyable: true, size: "large", x: 5, y: 9 };
    const [{ tall }] = getBushDraws(asContext(makeContext()), image, {
      date: spring,
      map: mapWithBushes([bush]),
    });

    expect(tall).toEqual({
      base: { height: 1, width: 3, x: 5, y: 9 },
      drawn: { height: 48, width: 48, x: 80, y: 112 },
    });
    expect(tall && isTallSpriteFaded(tall, cursorOn(6, 8))).toBe(true);
    expect(tall && isTallSpriteFaded(tall, cursorOn(7, 9))).toBe(false);
  });
});

describe("drawBushShadows", () => {
  it("draws the shadow of each bush that is on the farm, with the flip of the bush, but not under a Front tile", () => {
    const flipped: IFarmBush = {
      destroyable: true,
      size: "medium",
      ...findTile(true),
    };
    const hidden: IFarmBush = {
      destroyable: false,
      noShadow: true,
      size: "small",
      x: 2,
      y: 2,
    };
    const cut: IFarmBush = { destroyable: true, size: "small", x: 2, y: 5 };
    const context = makeContext();

    drawBushShadows(asContext(context), image, {
      cutBushes: [{ dateCut: 0, x: 2, y: 5 }],
      date: spring,
      map: mapWithBushes([flipped, hidden, cut]),
    });

    const { offset, sprite } = bushKinds.medium.shadow;

    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(
      image,
      ...sprite,
      0,
      0,
      sprite[2],
      sprite[3],
    );
    expect(context.translate).toHaveBeenCalledWith(
      flipped.x * 16 + offset.x + sprite[2],
      flipped.y * 16 + offset.y,
    );
  });
});
