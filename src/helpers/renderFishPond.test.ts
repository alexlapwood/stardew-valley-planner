import { buildings } from "../data/game/buildings.json";
import { water as strip } from "../data/game/water.json";
import {
  drawFishPond,
  getFishPondDraws,
  getNettingStyle,
  getPondWaterDraws,
} from "./renderFishPond";
import { getWaterMotion, type IWaterMotion } from "./water";

function getPond() {
  const { fishPond } = buildings.fish_pond;

  if (fishPond === undefined) {
    throw new Error("The fish pond in buildings.json has no pieces");
  }

  return fishPond;
}

const pond = getPond();
const tile = { x: 10, y: 20 };
const origin = { x: 10 * 16, y: 20 * 16 };
const still: IWaterMotion = { flip: false, frame: 3, slide: 0 };

describe("the fish pond pieces", () => {
  it("are the pieces of the game, from the export", () => {
    expect(pond.floor).toEqual({
      offset: { x: 0, y: 0 },
      sprite: [160, 3223, 80, 80],
    });
    expect(pond.water).toEqual({
      columns: 4,
      lastRowHeight: 6.75,
      offset: { x: 8, y: 8 },
      rows: 5,
    });
    expect(pond.edge.animation?.frameDuration).toBe(1250);
    expect(pond.edge.animation?.frames).toHaveLength(2);
    expect(
      pond.nettings.map(({ offset, sprite }) => [offset, sprite.slice(2)]),
    ).toEqual(Array.from({ length: 3 }, () => [{ x: 0, y: -32 }, [80, 48]]));
    expect(pond.nettingTileStep).toBe(3);
    expect(pond.sortY).toBe(8);
  });
});

describe("getNettingStyle", () => {
  it.each([
    [0, 0, 0],
    [2, 2, 0],
    [3, 0, 1],
    [0, 3, 1],
    [3, 3, 2],
    [6, 3, 0],
    [5, 7, 0],
    [10, 4, 1],
    [44, 20, 2],
  ])(
    "gives the tile %i, %i style (x / 3 + y / 3) mod 3 = %i",
    (x, y, style) => {
      expect(getNettingStyle(pond, { x, y })).toBe(style);
    },
  );
});

const waterRows = (motion: IWaterMotion) =>
  getPondWaterDraws(pond.water, tile, motion)
    .slice(0, 5)
    .map(({ source }) => source[1]);

describe("getPondWaterDraws", () => {
  const sx = 3 * 16;

  it("draws 4 by 5 tiles of the water strip from 8, 8, with a short last row", () => {
    const draws = getPondWaterDraws(pond.water, tile, still);

    expect(draws).toHaveLength(20);
    expect(draws.map(({ dx, dy }) => [dx - origin.x, dy - origin.y])).toEqual(
      [8, 24, 40, 56, 72].flatMap((y) => [8, 24, 40, 56].map((x) => [x, y])),
    );
    expect(draws.map(({ source }) => source[3])).toEqual([
      ...Array<number>(16).fill(16),
      ...Array<number>(4).fill(6.75),
    ]);
  });

  it("picks the row of the strip by the parity of each tile and the flip, as the farm water does", () => {
    expect(waterRows(still)).toEqual([0, 16, 0, 16, 16]);
    expect(waterRows({ ...still, flip: true })).toEqual([16, 0, 16, 0, 0]);
  });

  it("uses the frame of the farm water", () => {
    expect(
      getPondWaterDraws(pond.water, tile, still).every(
        ({ source }) => source[0] === sx,
      ),
    ).toBe(true);
  });

  it("slides up: the first row loses the slide at its top, and the last row grows by it", () => {
    const draws = getPondWaterDraws(pond.water, tile, { ...still, slide: 5 });
    const [top] = draws;
    const middle = draws[4];
    const last = draws[16];

    expect(top).toEqual({
      dx: origin.x + 8,
      dy: origin.y + 8,
      source: [sx, 5, 16, 11],
    });
    expect(middle).toEqual({
      dx: origin.x + 8,
      dy: origin.y + 24 - 5,
      source: [sx, 16, 16, 16],
    });
    expect(last).toEqual({
      dx: origin.x + 8,
      dy: origin.y + 72 - 5,
      source: [sx, 0, 16, 11.75],
    });
  });
});

describe("getFishPondDraws", () => {
  const names = new Map<string, string>([
    [pond.floor.sprite.join(), "floor"],
    ...(pond.edge.animation?.frames ?? []).map(
      (frame, index): [string, string] => [frame.join(), `edge ${index}`],
    ),
    ...pond.nettings.map(({ sprite }, style): [string, string] => [
      sprite.join(),
      `netting ${style}`,
    ]),
  ]);
  const nameDraws = (time?: number, at = tile) =>
    getFishPondDraws(pond, at, time).map(({ sheet, source }) =>
      sheet === "water" ? "water" : names.get(source.join()),
    );

  it("draws the floor, the water, the edge with the float and the netting, from the bottom up", () => {
    expect(nameDraws(0)).toEqual([
      "floor",
      ...Array<string>(20).fill("water"),
      "edge 0",
      "netting 0",
    ]);
  });

  it("puts the floor and the edge at the top-left of the footprint, and the netting 32 px over it", () => {
    const draws = getFishPondDraws(pond, tile, 0);

    expect(
      [draws[0], draws[21], draws[22]].map(({ dx, dy }) => [dx, dy]),
    ).toEqual([
      [origin.x, origin.y],
      [origin.x, origin.y],
      [origin.x, origin.y - 32],
    ]);
  });

  it.each([
    [0, "edge 0"],
    [1249, "edge 0"],
    [1250, "edge 1"],
    [2499, "edge 1"],
    [2500, "edge 0"],
  ])("bobs the float: at %i ms it draws the %s frame", (time, edge) => {
    expect(nameDraws(time)[21]).toBe(edge);
  });

  it("draws the still edge, and the water as at 0 ms, with no time", () => {
    expect(getFishPondDraws(pond, tile)[21].source).toBe(pond.edge.sprite);
    expect(getFishPondDraws(pond, tile).slice(1, 21)).toEqual(
      getFishPondDraws(pond, tile, 0).slice(1, 21),
    );
  });

  it("moves the water with the farm water", () => {
    const water = getFishPondDraws(pond, tile, 1000)
      .slice(1, 21)
      .map(({ dx, dy, source }) => ({ dx, dy, source }));

    expect(water).toEqual(
      getPondWaterDraws(pond.water, tile, getWaterMotion(strip, 1000)),
    );
  });

  it.each([
    [{ x: 0, y: 0 }, "netting 0"],
    [{ x: 3, y: 0 }, "netting 1"],
    [{ x: 3, y: 3 }, "netting 2"],
  ])("draws the netting style of the tile %o", (at, netting) => {
    expect(nameDraws(0, at).at(-1)).toBe(netting);
  });
});

describe("drawFishPond", () => {
  const buildingsImage = document.createElement("canvas");
  const waterImage = document.createElement("canvas");

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (() => ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: vi.fn(),
      })) as unknown as HTMLCanvasElement["getContext"],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function drawImages(tint?: TRgba) {
    const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;

    drawFishPond(
      context,
      { buildings: buildingsImage, water: { image: waterImage, tint } },
      pond,
      tile,
      0,
    );

    return drawImage.mock.calls.map(([image]) =>
      image === buildingsImage ? "buildings" : "water",
    );
  }

  it("draws the water from the farm water strip, tinted with the farm water", () => {
    expect(drawImages([120, 201, 255, 127])).toEqual([
      "buildings",
      ...Array<string>(20).fill("water"),
      "buildings",
      "buildings",
    ]);
  });

  it("draws no water when the farm water has no tint in the season", () => {
    expect(drawImages()).toEqual(["buildings", "buildings", "buildings"]);
  });

  it("fades the floor, the edge and the netting, and not the water, as the game does (SV › FishPond.draw)", () => {
    const alphas: [string, number][] = [];
    const context = {
      drawImage: vi.fn<(image: CanvasImageSource) => void>(),
      globalAlpha: 0.5,
    };

    context.drawImage.mockImplementation((image) => {
      alphas.push([
        image === buildingsImage ? "buildings" : "water",
        context.globalAlpha,
      ]);
    });

    drawFishPond(
      context as unknown as CanvasRenderingContext2D,
      {
        buildings: buildingsImage,
        water: { image: waterImage, tint: [120, 201, 255, 127] },
      },
      pond,
      tile,
      0,
      0.4,
    );

    expect(alphas).toEqual([
      ["buildings", 0.2],
      ...Array.from({ length: 20 }, (): [string, number] => ["water", 0.5]),
      ["buildings", 0.2],
      ["buildings", 0.2],
    ]);
    expect(context.globalAlpha).toBe(0.5);
  });
});
