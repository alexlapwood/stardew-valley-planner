import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { decodeFarmMap } from "./farmMap";
import {
  getFrontRows,
  getPassCanvas,
  getPassesNextChange,
  getTileSource,
  renderFrontRowToContext,
  type TMapPass,
} from "./renderFarmMap";

interface IRecordingContext {
  clearRect: ReturnType<typeof vi.fn<CanvasRenderingContext2D["clearRect"]>>;
  drawImage: ReturnType<typeof vi.fn<CanvasRenderingContext2D["drawImage"]>>;
  imageSmoothingEnabled: boolean;
}

const contexts = new Map<HTMLCanvasElement, IRecordingContext>();

function contextOf(canvas: HTMLCanvasElement) {
  let context = contexts.get(canvas);

  if (context === undefined) {
    context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
    };
    contexts.set(canvas, context);
  }

  return context;
}

const sheetA = document.createElement("canvas");
sheetA.id = "sheet-a";
const sheetB = document.createElement("canvas");
sheetB.id = "sheet-b";

function makeScene(layers: IFarmLayerData[]): IFarmScene {
  const file = makeTestFarmMapFile(3, 2);
  file.farm.tilesheets = [
    {
      columns: 2,
      firstGid: 9,
      id: "b",
      images: { spring: "b" },
      rows: 2,
      seasonal: false,
      tileHeight: 16,
      tileWidth: 16,
    },
    {
      columns: 4,
      firstGid: 1,
      id: "a",
      images: { spring: "a" },
      rows: 2,
      seasonal: false,
      tileHeight: 16,
      tileWidth: 16,
    },
  ];
  file.farm.animations = [
    { frames: [2, 10], gid: 13, interval: 100 },
    { frames: [3, 4], gid: 14, interval: 300 },
    { frames: [5], gid: 15, interval: 50 },
  ];
  file.farm.layers = layers;

  return {
    map: decodeFarmMap("small", file),
    season: "spring",
    sheets: [sheetA, sheetB],
  };
}

const allLayers: IFarmLayerData[] = [
  { group: "Back", id: "Back", tiles: [1, 1, 1, 1, 1, 1] },
  { group: "Buildings", id: "Buildings", tiles: [-1, 6, -4] },
  { group: "Front", id: "Front", tiles: [-5, 13] },
  { group: "AlwaysFront", id: "AlwaysFront2", tiles: [-3, 11, -2] },
];

function tileDraw(
  image: CanvasImageSource,
  sx: number,
  sy: number,
  x: number,
  y: number,
) {
  return [image, sx, sy, 16, 16, x * 16, y * 16, 16, 16];
}

beforeEach(() => {
  contexts.clear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return contextOf(this);
    } as unknown as HTMLCanvasElement["getContext"],
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getTileSource", () => {
  const { map } = makeScene(allLayers);

  it.each([
    ["the first tilesheet", 6, { sheet: 0, sx: 16, sy: 16 }],
    ["a later tilesheet", 11, { sheet: 1, sx: 0, sy: 16 }],
  ])("finds a tile in %s by its gid", (_, gid, source) => {
    expect(getTileSource(map, gid, 0)).toEqual({
      ...source,
      height: 16,
      width: 16,
    });
  });

  it.each([
    [0, { sheet: 0, sx: 16, sy: 0 }],
    [150, { sheet: 1, sx: 16, sy: 0 }],
    [250, { sheet: 0, sx: 16, sy: 0 }],
  ])("finds the frame of an animated tile at %d ms", (time, source) => {
    expect(getTileSource(map, 13, time)).toMatchObject(source);
  });

  it("finds nothing for a gid with no tilesheet or animation", () => {
    expect(getTileSource(map, 99, 0)).toBeUndefined();
  });
});

describe("getPassCanvas", () => {
  it("draws Back, Buildings, Front and AlwaysFront each on its own canvas", () => {
    const scene = makeScene(allLayers);
    const drawsOf = (pass: TMapPass) =>
      contextOf(getPassCanvas(scene, pass)).drawImage.mock.calls;

    expect(drawsOf("back")).toEqual([
      tileDraw(sheetA, 0, 0, 0, 0),
      tileDraw(sheetA, 0, 0, 1, 0),
      tileDraw(sheetA, 0, 0, 2, 0),
      tileDraw(sheetA, 0, 0, 0, 1),
      tileDraw(sheetA, 0, 0, 1, 1),
      tileDraw(sheetA, 0, 0, 2, 1),
    ]);
    expect(drawsOf("buildings")).toEqual([tileDraw(sheetA, 16, 16, 1, 0)]);
    expect(drawsOf("front")).toEqual([tileDraw(sheetA, 16, 0, 2, 1)]);
    expect(drawsOf("above")).toEqual([tileDraw(sheetB, 0, 16, 0, 1)]);

    const back = getPassCanvas(scene, "back");

    expect([back.width, back.height]).toEqual([48, 32]);
  });

  it("keeps its canvas and draws again only the cells of the animations that change frame, with every layer of the pass in order", () => {
    const scene = makeScene([
      { group: "Back", id: "Back", tiles: [1, 1, 1, 1, 1, 1] },
      { group: "Back", id: "Back2", tiles: [-1, 13, -1, 14, -2] },
      { group: "Buildings", id: "Buildings", tiles: [-1, 6, -4] },
    ]);
    const back = getPassCanvas(scene, "back", 0);
    const buildings = getPassCanvas(scene, "buildings", 0);
    const backContext = contextOf(back);
    backContext.drawImage.mockClear();

    expect(getPassCanvas(scene, "back", 99)).toBe(back);
    expect(backContext.drawImage).not.toHaveBeenCalled();

    expect(getPassCanvas(scene, "back", 100)).toBe(back);
    expect(backContext.clearRect.mock.calls).toEqual([[16, 0, 16, 16]]);
    expect(backContext.drawImage.mock.calls).toEqual([
      tileDraw(sheetA, 0, 0, 1, 0),
      tileDraw(sheetB, 16, 0, 1, 0),
    ]);

    contextOf(buildings).drawImage.mockClear();

    expect(getPassCanvas(scene, "buildings", 100)).toBe(buildings);
    expect(contextOf(buildings).drawImage).not.toHaveBeenCalled();
  });

  it("draws new canvases for a new scene", () => {
    const back = getPassCanvas(makeScene(allLayers), "back");

    expect(getPassCanvas(makeScene(allLayers), "back")).not.toBe(back);
  });

  it("warns about tiles that it cannot draw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    getPassCanvas(
      makeScene([{ group: "Back", id: "Back", tiles: [99, -5] }]),
      "back",
    );

    expect(warn).toHaveBeenCalledWith(
      "The small farm map has tiles with no tilesheet or animation.",
      [99],
    );
  });
});

describe("getPassesNextChange", () => {
  const { map } = makeScene([
    { group: "Back", id: "Back", tiles: [13, -5] },
    { group: "Buildings", id: "Buildings", tiles: [-1, 6, -4] },
    { group: "Front", id: "Front", tiles: [-5, 14] },
    { group: "AlwaysFront", id: "AlwaysFront", tiles: [15, -5] },
  ]);

  it.each<[string, TMapPass[], number, number]>([
    ["an animation", ["front"], 0, 300],
    ["an animation, from inside a frame", ["back"], 150, 200],
    ["an animation, from the start of a frame", ["back"], 200, 300],
    ["the earliest of two animations", ["front", "back"], 0, 100],
    ["a pass with no animated tiles", ["buildings"], 0, Infinity],
    ["a pass with a one-frame animation", ["above"], 0, Infinity],
  ])("finds the next frame change of %s", (_, passes, time, next) => {
    expect(getPassesNextChange(map, passes)(time)).toBe(next);
  });
});

describe("getFrontRows", () => {
  it("finds the rows that have Front tiles", () => {
    expect(getFrontRows(makeScene(allLayers).map)).toEqual([1]);
  });
});

describe("renderFrontRowToContext", () => {
  it("draws one row of the Front canvas at its own place", () => {
    const front = getPassCanvas(makeScene(allLayers), "front");
    const target = contextOf(document.createElement("canvas"));

    renderFrontRowToContext(
      target as unknown as CanvasRenderingContext2D,
      front,
      1,
    );

    expect(target.drawImage.mock.calls).toEqual([
      [front, 0, 16, 48, 16, 0, 16, 48, 16],
    ]);
  });
});
