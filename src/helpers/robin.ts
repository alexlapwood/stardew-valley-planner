import { robin } from "../data/game/robin.json";
import { drawSprite } from "./atlas";
import type { IPixelRect } from "./tallSprites";

interface ISwingFrame {
  frame: number;
  start: number;
}

export interface IHammerSwing {
  frames: ISwingFrame[];
  length: number;
}

// The game picks a pause at random after each swing, and most of them are
// seconds long (SV › NPC.robinVariablePause). The planner takes the shortest
// choice of each step, so that a swing is the hammer frames with the short
// pause, and each swing takes the same time.
export function makeHammerSwing(
  steps: readonly IRobinHammerStep[],
): IHammerSwing {
  const frames: ISwingFrame[] = [];
  let length = 0;

  steps.forEach(({ choices }) => {
    const shortest = choices.reduce<IRobinHammerChoice | undefined>(
      (best, choice) =>
        best === undefined || choice.minMs < best.minMs ? choice : best,
      undefined,
    );

    if (shortest !== undefined && shortest.minMs > 0) {
      frames.push({ frame: shortest.frame, start: length });
      length += shortest.minMs;
    }
  });

  return { frames, length };
}

export const hammerSwing = makeHammerSwing(robin.hammer);

// time is in the swing, from 0 to the length of the swing.
export function getSwingFrame({ frames }: IHammerSwing, time: number) {
  return frames.findLast(({ start }) => start <= time)?.frame;
}

export function getSwingNextChange(
  { frames, length }: IHammerSwing,
  time: number,
) {
  return frames.find(({ start }) => start > time)?.start ?? length;
}

export function getRobinSprite(frame: number, season: string) {
  const robinFrame = robin.frames[frame];

  return robinFrame?.seasons?.[season] ?? robinFrame?.sprite;
}

export interface IRobinDraw {
  draw: () => void;
  drawn?: IPixelRect;
}

export function getRobinDraw(
  context: CanvasRenderingContext2D,
  robinImage: CanvasImageSource,
  standingPixel: IPixelOffset,
  season: string,
  frame: number | undefined,
): IRobinDraw {
  const sprite =
    frame === undefined ? undefined : getRobinSprite(frame, season);
  const { frameOffset, shadow } = robin;
  const x = standingPixel.x + frameOffset.x;
  const y = standingPixel.y + frameOffset.y;

  return {
    draw: () => {
      drawSprite(
        context,
        robinImage,
        shadow.sprite,
        standingPixel.x + shadow.offset.x,
        standingPixel.y + shadow.offset.y,
      );

      if (sprite !== undefined) {
        drawSprite(context, robinImage, sprite, x, y);
      }
    },
    drawn:
      sprite === undefined
        ? undefined
        : { height: sprite[3], width: sprite[2], x, y },
  };
}
