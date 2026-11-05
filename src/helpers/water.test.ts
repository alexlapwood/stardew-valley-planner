import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { water as strip } from "../data/game/water.json";
import { decodeFarmMap } from "./farmMap";
import {
  getWaterMotion,
  getWaterNextChange,
  getWaterRow,
  getWaterSlot,
  getWaterTileDraws,
  getWaterTiles,
  type IWaterMotion,
  tintPixels,
  waterImageUrl,
} from "./water";

function mapWithRows(rows: string[], hidden?: IFarmTile[]) {
  const file = makeTestFarmMapFile(rows[0].length, rows.length);
  file.farm.rules.rows = rows;
  file.farm.water.hidden = hidden;

  return decodeFarmMap("water", file);
}

function sceneOf(map: IFarmMap, season: string): IFarmScene {
  return { map, season, sheets: [] };
}

// 4: water, 0: no flags
const waterRows = ["440", "040", "044"];

describe("the water strip", () => {
  it("is the exported image", () => {
    expect(waterImageUrl).toBe("images/game/water.png");
  });
});

describe("getWaterMotion", () => {
  it.each([
    [0, 0],
    [199, 0],
    [200, 1],
    [1999, 9],
    [2000, 0],
  ])("shows at %i ms frame %i on all tiles", (time, frame) => {
    expect(getWaterMotion(strip, time).frame).toBe(frame);
  });

  it.each([
    [1, 0, 0, false],
    [1, 666, 0, false],
    [1, 667, 1, false],
    [1, 1000, 1, false],
    [1, 10_666, 15, false],
    [1, 10_667, 0, true],
    [1, 21_334, 0, false],
    [4, 166, 0, false],
    [4, 167, 0.25, false],
    [4, 1000, 1.5, false],
    [4, 10_666, 15.75, false],
    [4, 10_667, 0, true],
  ])(
    "at canvas scale %i, slides at %i ms by %d px in whole canvas pixels, and flips the rows at the end of each slide (flipped: %s)",
    (canvasScale, time, slide, flip) => {
      expect(getWaterMotion(strip, time, canvasScale)).toMatchObject({
        flip,
        slide,
      });
    },
  );

  it("slides in whole game pixels when there is no canvas scale", () => {
    expect(getWaterMotion(strip, 1000)).toEqual(getWaterMotion(strip, 1000, 1));
  });
});

describe("getWaterNextChange", () => {
  it.each([
    ["the next frame", 1, 0, 200],
    ["the first whole-pixel slide", 1, 600, 667],
    ["the next frame", 1, 667, 800],
    ["the flip at the end of the slide", 1, 10_600, 10_667],
    ["the first slide step", 4, 0, 167],
    ["the next frame", 4, 167, 200],
    ["the next slide step", 4, 200, 334],
  ])(
    "gives %s at canvas scale %i after %i ms",
    (_, canvasScale, time, next) => {
      expect(getWaterNextChange(strip, time, canvasScale)).toBe(next);
    },
  );

  it("uses a canvas scale of 1 when there is no canvas scale", () => {
    expect(getWaterNextChange(strip, 600)).toBe(667);
  });

  it.each([1, 4])(
    "gives at canvas scale %i each time at which the water changes, and no time in between",
    (canvasScale) => {
      const motionAt = (time: number) =>
        getWaterMotion(strip, time, canvasScale);
      let time = 0;

      for (let change = 0; change < 400; change += 1) {
        const next = getWaterNextChange(strip, time, canvasScale);

        expect(next).toBeGreaterThan(time);
        expect(motionAt(next - 1)).toEqual(motionAt(time));
        expect(motionAt(next)).not.toEqual(motionAt(time));

        time = next;
      }
    },
  );
});

describe("getWaterRow", () => {
  it.each([
    [0, 0, false, 0],
    [1, 0, false, 1],
    [0, 0, true, 1],
    [2, 3, true, 0],
  ])("gives the tile at %i, %i (flipped: %s) row %i", (x, y, flip, row) => {
    expect(getWaterRow(x, y, flip)).toBe(row);
  });
});

describe("getWaterTileDraws", () => {
  const motion: IWaterMotion = { flip: false, frame: 3, slide: 5 };
  const sx = 3 * 16;

  it("draws a top tile from the slide down, at the top of the tile", () => {
    expect(
      getWaterTileDraws(
        strip,
        { bottom: false, top: true, x: 2, y: 4 },
        motion,
      ),
    ).toEqual([{ dx: 32, dy: 64, source: [sx, 5, 16, 11] }]);
  });

  it("draws a middle tile whole, moved up by the slide", () => {
    expect(
      getWaterTileDraws(
        strip,
        { bottom: false, top: false, x: 3, y: 4 },
        motion,
      ),
    ).toEqual([{ dx: 48, dy: 59, source: [sx, 16, 16, 16] }]);
  });

  it("fills the gap under a bottom tile with the top of the row of the tile below", () => {
    expect(
      getWaterTileDraws(
        strip,
        { bottom: true, top: false, x: 2, y: 5 },
        motion,
      ),
    ).toEqual([
      { dx: 32, dy: 75, source: [sx, 16, 16, 16] },
      { dx: 32, dy: 91, source: [sx, 0, 16, 5] },
    ]);
  });

  it("draws a tile that is the top and the bottom of the water", () => {
    expect(
      getWaterTileDraws(strip, { bottom: true, top: true, x: 2, y: 4 }, motion),
    ).toEqual([
      { dx: 32, dy: 64, source: [sx, 5, 16, 11] },
      { dx: 32, dy: 75, source: [sx, 16, 16, 5] },
    ]);
  });

  it("uses the other row when the rows are flipped", () => {
    expect(
      getWaterTileDraws(
        strip,
        { bottom: false, top: true, x: 2, y: 4 },
        { ...motion, flip: true },
      ),
    ).toEqual([{ dx: 32, dy: 64, source: [sx, 21, 16, 11] }]);
  });

  it("draws no gap under a bottom tile when the strip has not slid", () => {
    expect(
      getWaterTileDraws(
        strip,
        { bottom: true, top: false, x: 2, y: 5 },
        { ...motion, slide: 0 },
      ),
    ).toEqual([{ dx: 32, dy: 80, source: [sx, 16, 16, 16] }]);
  });
});

describe("getWaterTiles", () => {
  it("finds the water tiles and the tiles at the top and the bottom of the water", () => {
    expect(getWaterTiles(mapWithRows(waterRows))).toEqual([
      { bottom: true, top: true, x: 0, y: 0 },
      { bottom: false, top: true, x: 1, y: 0 },
      { bottom: false, top: false, x: 1, y: 1 },
      { bottom: true, top: false, x: 1, y: 2 },
      { bottom: true, top: true, x: 2, y: 2 },
    ]);
  });

  it("does not draw the hidden tiles, but counts them as water for the tiles next to them", () => {
    expect(getWaterTiles(mapWithRows(waterRows, [{ x: 1, y: 1 }]))).toEqual([
      { bottom: true, top: true, x: 0, y: 0 },
      { bottom: false, top: true, x: 1, y: 0 },
      { bottom: true, top: false, x: 1, y: 2 },
      { bottom: true, top: true, x: 2, y: 2 },
    ]);
  });
});

describe("tintPixels", () => {
  it("multiplies each channel of each straight-alpha pixel by the tint / 255, alpha too", () => {
    const pixels = new Uint8ClampedArray([200, 100, 50, 255, 0, 255, 255, 0]);

    tintPixels(pixels, [120, 201, 255, 127]);

    expect([...pixels]).toEqual([94, 79, 50, 127, 0, 201, 255, 0]);
  });
});

describe("getWaterSlot", () => {
  const stripImage = document.createElement("canvas");
  const getImageData = vi.fn(() => ({
    data: new Uint8ClampedArray([200, 100, 50, 255]),
  }));
  const putImageData = vi.fn();

  beforeEach(() => {
    getImageData.mockClear();
    putImageData.mockClear();
    const context = { drawImage: vi.fn(), getImageData, putImageData };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (() => context) as unknown as HTMLCanvasElement["getContext"],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["the map has no water", mapWithRows(["000"])],
    ["all the water is hidden", mapWithRows(["40"], [{ x: 0, y: 0 }])],
  ])("is not there when %s", (_, map) => {
    expect(getWaterSlot(sceneOf(map, "spring"), stripImage)).toBeUndefined();
  });

  it("draws each water tile from the strip with the tint of the season, and tints the strip one time", () => {
    const slot = getWaterSlot(
      sceneOf(mapWithRows(waterRows), "winter"),
      stripImage,
    );
    const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;

    slot?.draw(context, 0);
    slot?.draw(context, 700);

    expect(getImageData).toHaveBeenCalledOnce();
    expect(putImageData.mock.calls[0][0]).toEqual({
      data: new Uint8ClampedArray([103, 31, 50, 127]),
    });

    const [firstDraw] = drawImage.mock.calls;

    expect(firstDraw[0]).toBeInstanceOf(HTMLCanvasElement);
    expect(firstDraw[0]).not.toBe(stripImage);
    expect(firstDraw.slice(1)).toEqual([0, 0, 16, 16, 0, 0, 16, 16]);
    expect(drawImage).toHaveBeenCalledTimes(5 + 5 + 3);
  });

  it.each([
    [1, [80, 1, 16, 15, 0, 0, 16, 15], [80, 16, 16, 1, 0, 15, 16, 1]],
    [
      4,
      [80, 1.5, 16, 14.5, 0, 0, 16, 14.5],
      [80, 16, 16, 1.5, 0, 14.5, 16, 1.5],
    ],
  ])(
    "draws the slide in whole canvas pixels at canvas scale %i",
    (canvasScale, top, gapBelow) => {
      const slot = getWaterSlot(
        sceneOf(mapWithRows(waterRows), "spring"),
        stripImage,
        canvasScale,
      );
      const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
      const context = { drawImage } as unknown as CanvasRenderingContext2D;

      slot?.draw(context, 1000);

      expect(
        drawImage.mock.calls.slice(0, 2).map(([, ...source]) => source),
      ).toEqual([top, gapBelow]);
    },
  );

  it.each([
    [undefined, 400],
    [1, 400],
    [4, 334],
  ])(
    "changes at canvas scale %s when the water frame or the shown slide changes",
    (canvasScale, next) => {
      const slot = getWaterSlot(
        sceneOf(mapWithRows(waterRows), "spring"),
        stripImage,
        canvasScale,
      );

      expect(slot?.nextChange?.(200)).toBe(next);
    },
  );
});
