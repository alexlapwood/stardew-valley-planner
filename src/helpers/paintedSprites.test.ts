import {
  drawPaintedSprite,
  getPaintedSprite,
  hslToRgb,
  type IPaintJob,
  paintPixel,
  paintPixels,
  rgbToHsl,
} from "./paintedSprites";

type TRgb = [number, number, number];

const color = (
  hue: number,
  saturation: number,
  lightness: number,
): IPaintColor => ({ hue, lightness, saturation });

const red: TRgb = [255, 0, 0];
const lime: TRgb = [0, 255, 0];
const blue: TRgb = [0, 0, 255];

// The results of the game's own Utility.RGBtoHSL and Utility.HSLtoRGB, in the
// 2 passes of BuildingPainter.Apply, from Stardew Valley.dll 1.6.15.
const gameResults: [TRgb, IPaintColor, TRgb][] = [
  [[255, 0, 0], color(0, 75, -30), [88, 12, 12]],
  [[255, 0, 0], color(210, 60, -12), [38, 96, 154]],
  [[255, 0, 0], color(360, 0, 0), [127, 127, 127]],
  [[255, 0, 0], color(45, 75, 25), [238, 214, 142]],
  [[128, 64, 32], color(210, 60, -12), [19, 49, 79]],
  [[128, 64, 32], color(360, 0, 0), [80, 80, 80]],
  [[128, 64, 32], color(300, 20, -16), [47, 31, 47]],
  [[200, 180, 160], color(123, 45, -50), [28, 74, 30]],
  [[200, 180, 160], color(45, 75, 25), [251, 247, 233]],
  [[12, 34, 56], color(45, 75, 25), [171, 134, 24]],
  [[255, 255, 255], color(0, 75, -30), [235, 121, 121]],
  [[255, 255, 255], color(123, 45, -50), [70, 184, 75]],
  [[0, 0, 0], color(45, 75, 25), [111, 87, 15]],
  [[91, 43, 41], color(210, 60, -12), [14, 35, 56]],
  [[170, 120, 69], color(0, 75, -30), [74, 10, 10]],
  [[170, 120, 69], color(300, 20, -16), [93, 62, 93]],
];

describe("rgbToHsl and hslToRgb", () => {
  it("give the values of the game, with its rounding down", () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 1, 0.5]);
    expect(rgbToHsl(128, 64, 32)).toEqual([20.000000000000004, 0.6, 80 / 255]);
    expect(rgbToHsl(12, 34, 56)).toEqual([
      210, 0.6470588235294118, 0.13333333333333333,
    ]);
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(90, 0.5, 0.25)).toEqual([63, 95, 31]);
    expect(hslToRgb(200, 0.75, 0.4375)).toEqual([27, 139, 195]);
    expect(hslToRgb(359, 0.2, 0.8)).toEqual([214, 193, 194]);
  });
});

describe("paintPixel", () => {
  it.each(gameResults)(
    "paints %j with %o to the game's %j",
    (pixel, paint, expected) => {
      expect(paintPixel(pixel, paint)).toEqual(expected);
    },
  );
});

const rgba = (...pixels: number[][]) => new Uint8ClampedArray(pixels.flat());

describe("paintPixels", () => {
  const regions = [
    { color: color(210, 60, -12), maskColor: red },
    { color: color(0, 75, -30), maskColor: blue },
  ];

  it("paints only the pixels whose mask pixel is exactly the colour of a region, and keeps their alpha", () => {
    const pixels = rgba(
      [255, 0, 0, 255],
      [255, 0, 0, 128],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
    );

    paintPixels(
      pixels,
      rgba(
        [...red, 255],
        [...blue, 255],
        [...lime, 255],
        [254, 0, 0, 255],
        [...red, 254],
      ),
      regions,
    );

    expect(Array.from(pixels)).toEqual(
      [
        [38, 96, 154, 255],
        [88, 12, 12, 128],
        [255, 0, 0, 255],
        [255, 0, 0, 255],
        [255, 0, 0, 255],
      ].flat(),
    );
  });

  it("paints no pixel past the end of a short mask", () => {
    const pixels = rgba([255, 0, 0, 255], [255, 0, 0, 255]);

    paintPixels(pixels, rgba([...red, 255]), regions);

    expect(Array.from(pixels)).toEqual([38, 96, 154, 255, 255, 0, 0, 255]);
  });
});

describe("getPaintedSprite", () => {
  const job: IPaintJob = {
    mask: { offset: { x: -2, y: 4 }, sprite: [40, 50, 8, 6] },
    offset: { x: 0, y: 0 },
    regions: [{ color: color(210, 60, -12), maskColor: red }],
  };

  type TContext = CanvasRenderingContext2D;

  interface IFakeContext {
    clearRect: ReturnType<typeof vi.fn<TContext["clearRect"]>>;
    drawImage: ReturnType<typeof vi.fn<TContext["drawImage"]>>;
    getImageData: ReturnType<typeof vi.fn<() => { data: Uint8ClampedArray }>>;
    putImageData: ReturnType<typeof vi.fn<(imageData: ImageData) => void>>;
  }

  let contexts: IFakeContext[];

  beforeEach(() => {
    contexts = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (() => {
        const context: IFakeContext = {
          clearRect: vi.fn<TContext["clearRect"]>(),
          drawImage: vi.fn<TContext["drawImage"]>(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray([255, 0, 0, 255]),
          })),
          putImageData: vi.fn<(imageData: ImageData) => void>(),
        };

        contexts.push(context);

        return context;
      }) as unknown as HTMLCanvasElement["getContext"],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws the mask in line with the sprite, then the frame, and paints the frame", () => {
    const image = document.createElement("canvas");
    const sprite = getPaintedSprite(image, [0, 0, 8, 10], job);
    const [context] = contexts;

    expect(sprite?.width).toBe(8);
    expect(sprite?.height).toBe(10);
    expect(context.drawImage.mock.calls).toEqual([
      [image, 40, 50, 8, 6, -2, 4, 8, 6],
      [image, 0, 0, 8, 10, 0, 0, 8, 10],
    ]);
    expect(Array.from(context.putImageData.mock.calls[0][0].data)).toEqual([
      38, 96, 154, 255,
    ]);
  });

  it("paints each frame and colour 1 time, and draws it again from the cache", () => {
    const image = document.createElement("canvas");
    const first = getPaintedSprite(image, [0, 0, 8, 10], job);

    expect(getPaintedSprite(image, [0, 0, 8, 10], job)).toBe(first);
    expect(contexts).toHaveLength(1);

    getPaintedSprite(image, [8, 0, 8, 10], job);
    getPaintedSprite(image, [0, 0, 8, 10], {
      ...job,
      regions: [{ color: color(0, 75, -30), maskColor: red }],
    });

    expect(contexts).toHaveLength(3);
  });

  it("does not paint an image that has not loaded", () => {
    expect(
      getPaintedSprite(document.createElement("img"), [0, 0, 8, 10], job),
    ).toBeUndefined();
    expect(contexts).toHaveLength(0);
  });

  it("draws the painted sprite in the place of the frame, and the frame as it is with no job", () => {
    const image = document.createElement("canvas");
    const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;

    drawPaintedSprite(context, image, [0, 0, 8, 10], 100, 200);
    drawPaintedSprite(context, image, [0, 0, 8, 10], 100, 200, job);

    expect(drawImage.mock.calls[0]).toEqual([
      image,
      0,
      0,
      8,
      10,
      100,
      200,
      8,
      10,
    ]);
    expect(drawImage.mock.calls[1][0]).toBeInstanceOf(HTMLCanvasElement);
    expect(drawImage.mock.calls[1][0]).not.toBe(image);
    expect(drawImage.mock.calls[1].slice(1)).toEqual([
      0, 0, 8, 10, 100, 200, 8, 10,
    ]);
  });
});
