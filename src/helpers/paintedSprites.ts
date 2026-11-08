import { drawSprite } from "./atlas";

type TRgb = [red: number, green: number, blue: number];

type THsl = [hue: number, saturation: number, lightness: number];

// color goes on the sprite pixels where the mask is exactly maskColor.
export interface IMaskPaint {
  color: IPaintColor;
  maskColor: TRgb;
}

// offset is the offset of the sprite that the mask paints.
export interface IPaintJob {
  mask: ISpritePiece;
  offset: IPixelOffset;
  regions: readonly IMaskPaint[];
}

const maskAlpha = 255;

// The map can show many colours while the player moves a slider, so only the
// sprites that were used last stay.
const maxPaintedSprites = 64;

// The game's own maths and rounding, so that each painted pixel has the RGB
// of the game (SV › Utility.RGBtoHSL).
export function rgbToHsl(red: number, green: number, blue: number): THsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (Math.abs(delta) < 1e-5) {
    return [0, 0, lightness];
  }

  const saturation =
    lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
  const rDistance = (max - r) / delta;
  const gDistance = (max - g) / delta;
  const bDistance = (max - b) / delta;
  let hue =
    r === max
      ? bDistance - gDistance
      : g === max
        ? 2 + rDistance - bDistance
        : 4 + gDistance - rDistance;

  hue *= 60;

  return [hue < 0 ? hue + 360 : hue, saturation, lightness];
}

function hueToChannel(q1: number, q2: number, hue: number) {
  const h = hue > 360 ? hue - 360 : hue < 0 ? hue + 360 : hue;

  if (h < 60) {
    return q1 + ((q2 - q1) * h) / 60;
  }

  if (h < 180) {
    return q2;
  }

  if (h < 240) {
    return q1 + ((q2 - q1) * (240 - h)) / 60;
  }

  return q1;
}

const toByte = (channel: number) => Math.trunc(channel * 255);

// SV › Utility.HSLtoRGB, which rounds down.
export function hslToRgb(
  hue: number,
  saturation: number,
  lightness: number,
): TRgb {
  const q2 =
    lightness <= 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const q1 = 2 * lightness - q2;

  if (saturation === 0) {
    const grey = toByte(lightness);

    return [grey, grey, grey];
  }

  return [
    toByte(hueToChannel(q1, q2, hue + 120)),
    toByte(hueToChannel(q1, q2, hue)),
    toByte(hueToChannel(q1, q2, hue - 120)),
  ];
}

const clampUnit = (value: number) => Math.min(Math.max(value, 0), 1);

function shiftPixel(
  [red, green, blue]: TRgb,
  hueShift: number,
  saturationShift: number,
  lightnessShift: number,
) {
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  let shiftedHue = hue + hueShift;

  while (shiftedHue > 360) {
    shiftedHue -= 360;
  }

  while (shiftedHue < 0) {
    shiftedHue += 360;
  }

  return hslToRgb(
    shiftedHue,
    clampUnit(saturation + saturationShift / 100),
    clampUnit(lightness + lightnessShift / 100),
  );
}

// The game takes all the colour out of the pixel first, so the pixel keeps
// only its lightness, and the shading of the sprite stays (SV ›
// BuildingPainter.Apply).
export function paintPixel(
  pixel: TRgb,
  { hue, lightness, saturation }: IPaintColor,
) {
  return shiftPixel(shiftPixel(pixel, 0, -100, 0), hue, saturation, lightness);
}

function findMaskRegion(
  mask: Uint8ClampedArray,
  index: number,
  regions: readonly IMaskPaint[],
) {
  return mask[index + 3] === maskAlpha
    ? regions.find(
        ({ maskColor: [red, green, blue] }) =>
          mask[index] === red &&
          mask[index + 1] === green &&
          mask[index + 2] === blue,
      )
    : undefined;
}

// pixels and mask are RGBA, with the mask pixel of each sprite pixel at the
// same index (SV › BuildingPainter.Apply).
export function paintPixels(
  pixels: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  regions: readonly IMaskPaint[],
) {
  const length = Math.min(pixels.length, mask.length);

  for (let index = 0; index + 3 < length; index += 4) {
    const region = findMaskRegion(mask, index, regions);

    if (region !== undefined) {
      const [red, green, blue] = paintPixel(
        [pixels[index], pixels[index + 1], pixels[index + 2]],
        region.color,
      );

      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
    }
  }
}

// An image that has not loaded has no pixels yet, and a sprite painted from
// it must not stay in the cache.
function hasPixels(image: CanvasImageSource) {
  return !(image instanceof HTMLImageElement) || image.naturalWidth > 0;
}

function makePaintedSprite(
  image: CanvasImageSource,
  frame: TSpriteRect,
  { mask, offset, regions }: IPaintJob,
) {
  const [, , width, height] = frame;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (context === null) {
    return undefined;
  }

  drawSprite(
    context,
    image,
    mask.sprite,
    mask.offset.x - offset.x,
    mask.offset.y - offset.y,
  );

  const maskPixels = context.getImageData(0, 0, width, height).data;

  context.clearRect(0, 0, width, height);
  drawSprite(context, image, frame, 0, 0);

  const pixels = context.getImageData(0, 0, width, height);

  paintPixels(pixels.data, maskPixels, regions);
  context.putImageData(pixels, 0, 0);

  return canvas;
}

function getJobKey(frame: TSpriteRect, { mask, offset, regions }: IPaintJob) {
  return JSON.stringify([
    frame,
    mask.sprite,
    mask.offset.x - offset.x,
    mask.offset.y - offset.y,
    regions,
  ]);
}

const paintedSprites = new WeakMap<
  CanvasImageSource,
  Map<string, HTMLCanvasElement>
>();

export function getPaintedSprite(
  image: CanvasImageSource,
  frame: TSpriteRect,
  job: IPaintJob,
) {
  let byJob = paintedSprites.get(image);

  if (byJob === undefined) {
    byJob = new Map();
    paintedSprites.set(image, byJob);
  }

  const key = getJobKey(frame, job);
  const cached = byJob.get(key);

  if (cached !== undefined) {
    byJob.delete(key);
    byJob.set(key, cached);

    return cached;
  }

  const painted = hasPixels(image)
    ? makePaintedSprite(image, frame, job)
    : undefined;

  if (painted === undefined) {
    return undefined;
  }

  if (byJob.size >= maxPaintedSprites) {
    const oldest = byJob.keys().next().value;

    if (oldest !== undefined) {
      byJob.delete(oldest);
    }
  }

  byJob.set(key, painted);

  return painted;
}

// With no job, or when the sprite cannot be painted, the sprite draws as it
// is.
export function drawPaintedSprite(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  frame: TSpriteRect,
  dx: number,
  dy: number,
  job?: IPaintJob,
) {
  const painted =
    job === undefined ? undefined : getPaintedSprite(image, frame, job);
  const [, , width, height] = frame;

  if (painted === undefined) {
    drawSprite(context, image, frame, dx, dy);
  } else {
    drawSprite(context, painted, [0, 0, width, height], dx, dy);
  }
}
