import { water as waterStrip } from "../data/game/water.json";
import { drawSprite } from "./atlas";
import { flagsAt, isOnMap } from "./farmMap";
import type { IMapSlot } from "./mapSlots";

const tileSize = 16;

export const waterImageUrl = `images/game/${waterStrip.image}.png`;

export interface IWaterTile {
  bottom: boolean;
  top: boolean;
  x: number;
  y: number;
}

export interface IWaterMotion {
  flip: boolean;
  frame: number;
  slide: number;
}

export interface IWaterDraw {
  dx: number;
  dy: number;
  source: TSpriteRect;
}

function getSlideSteps(strip: IWaterStrip, time: number) {
  return Math.floor((time * strip.slideSpeed) / (strip.slideStep * 1000));
}

function getStepsPerSlide(strip: IWaterStrip) {
  return Math.round(strip.slideLength / strip.slideStep);
}

// The map canvas shows only whole canvas pixels, so the slide moves only when
// it gets to the next canvas pixel. Then the map does not redraw for a slide
// step that it cannot show.
function getSlideCanvasPixels(
  strip: IWaterStrip,
  stepInSlide: number,
  canvasScale: number,
) {
  return Math.floor(stepInSlide * strip.slideStep * canvasScale);
}

export function getWaterMotion(
  strip: IWaterStrip,
  time: number,
  canvasScale = 1,
): IWaterMotion {
  const steps = getSlideSteps(strip, time);
  const stepsPerSlide = getStepsPerSlide(strip);
  const slidePixels = getSlideCanvasPixels(
    strip,
    steps % stepsPerSlide,
    canvasScale,
  );

  return {
    flip: Math.floor(steps / stepsPerSlide) % 2 === 1,
    frame: Math.floor(time / strip.frameInterval) % strip.frames,
    slide: slidePixels / canvasScale,
  };
}

function getNextVisibleStep(
  strip: IWaterStrip,
  steps: number,
  canvasScale: number,
) {
  const stepsPerSlide = getStepsPerSlide(strip);
  const stepInSlide = steps % stepsPerSlide;
  const slidePixels = getSlideCanvasPixels(strip, stepInSlide, canvasScale);
  let nextStepInSlide = stepInSlide + 1;

  while (
    nextStepInSlide < stepsPerSlide &&
    getSlideCanvasPixels(strip, nextStepInSlide, canvasScale) === slidePixels
  ) {
    nextStepInSlide += 1;
  }

  return steps - stepInSlide + nextStepInSlide;
}

// Floating-point rounding can put the calculated time just before the step,
// and then the clock would wait for a change that does not come.
function getStepTime(strip: IWaterStrip, step: number) {
  const time = Math.ceil((step * strip.slideStep * 1000) / strip.slideSpeed);

  return getSlideSteps(strip, time) < step ? time + 1 : time;
}

export function getWaterNextChange(
  strip: IWaterStrip,
  time: number,
  canvasScale = 1,
) {
  const nextFrame =
    (Math.floor(time / strip.frameInterval) + 1) * strip.frameInterval;
  const nextSlide = getStepTime(
    strip,
    getNextVisibleStep(strip, getSlideSteps(strip, time), canvasScale),
  );

  return Math.min(nextFrame, nextSlide);
}

export function getWaterRow(x: number, y: number, flip: boolean) {
  const odd = (x + y) % 2 === 1;

  return odd === flip ? 0 : 1;
}

export function getWaterTileDraws(
  strip: IWaterStrip,
  { bottom, top, x, y }: IWaterTile,
  { flip, frame, slide }: IWaterMotion,
): IWaterDraw[] {
  const { frameHeight, frameWidth } = strip;
  const sx = frame * frameWidth;
  const sy = getWaterRow(x, y, flip) * frameHeight;
  const dx = x * tileSize;
  const dy = y * tileSize;
  const draws: IWaterDraw[] = [
    top
      ? { dx, dy, source: [sx, sy + slide, frameWidth, frameHeight - slide] }
      : { dx, dy: dy - slide, source: [sx, sy, frameWidth, frameHeight] },
  ];

  if (bottom && slide > 0) {
    const rowBelow = getWaterRow(x, y + 1, flip);

    draws.push({
      dx,
      dy: dy + tileSize - slide,
      source: [sx, rowBelow * frameHeight, frameWidth, slide],
    });
  }

  return draws;
}

function findWaterTiles(map: IFarmMap) {
  const isWater = (x: number, y: number) =>
    isOnMap(map, x, y) && (flagsAt(map, x, y) & map.ruleFlags.water) !== 0;
  const hidden = new Set(
    (map.water.hidden ?? []).map(({ x, y }) => `${x},${y}`),
  );
  const tiles: IWaterTile[] = [];

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (isWater(x, y) && !hidden.has(`${x},${y}`)) {
        tiles.push({
          bottom: !isWater(x, y + 1),
          top: !isWater(x, y - 1),
          x,
          y,
        });
      }
    }
  }

  return tiles;
}

const waterTilesByMap = new WeakMap<IFarmMap, IWaterTile[]>();

export function getWaterTiles(map: IFarmMap) {
  let tiles = waterTilesByMap.get(map);

  if (tiles === undefined) {
    tiles = findWaterTiles(map);
    waterTilesByMap.set(map, tiles);
  }

  return tiles;
}

export function tintPixels(pixels: Uint8ClampedArray, tint: TRgba) {
  pixels.forEach((value, index) => {
    pixels[index] = (value * tint[index % 4]) / 255;
  });
}

function makeTintedStrip(
  strip: IWaterStrip,
  image: CanvasImageSource,
  tint: TRgba,
) {
  const canvas = document.createElement("canvas");
  canvas.width = strip.frameWidth * strip.frames;
  canvas.height = strip.frameHeight * strip.rows;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not get context for the water canvas");
  }

  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(pixels.data, tint);
  context.putImageData(pixels, 0, 0);

  return canvas;
}

const tintedStrips = new WeakMap<
  CanvasImageSource,
  Map<string, HTMLCanvasElement>
>();

export function getTintedStrip(
  strip: IWaterStrip,
  image: CanvasImageSource,
  tint: TRgba,
) {
  let byTint = tintedStrips.get(image);

  if (byTint === undefined) {
    byTint = new Map();
    tintedStrips.set(image, byTint);
  }

  const key = tint.join();
  let tinted = byTint.get(key);

  if (tinted === undefined) {
    tinted = makeTintedStrip(strip, image, tint);
    byTint.set(key, tinted);
  }

  return tinted;
}

export function getWaterSlot(
  scene: IFarmScene,
  image: CanvasImageSource,
  canvasScale = 1,
  strip = waterStrip,
): IMapSlot | undefined {
  const tiles = getWaterTiles(scene.map);
  const tint = scene.map.water.tints[scene.season];

  if (tiles.length === 0 || tint === undefined) {
    return undefined;
  }

  return {
    draw: (context, time) => {
      const tinted = getTintedStrip(strip, image, tint);
      const motion = getWaterMotion(strip, time, canvasScale);

      tiles.forEach((tile) => {
        getWaterTileDraws(strip, tile, motion).forEach(({ dx, dy, source }) => {
          drawSprite(context, tinted, source, dx, dy);
        });
      });
    },
    nextChange: (time) => getWaterNextChange(strip, time, canvasScale),
  };
}
