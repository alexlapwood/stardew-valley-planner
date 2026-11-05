export type TNextChange = (time: number) => number;

export const noChange: TNextChange = () => Infinity;

export function getFrameIndex(animation: IFarmAnimation, time: number) {
  return Math.floor(time / animation.interval) % animation.frames.length;
}

function getNextChangeOf({ frames, interval }: IFarmAnimation, time: number) {
  return frames.length > 1
    ? (Math.floor(time / interval) + 1) * interval
    : Infinity;
}

export function getNextFrameChange(
  animations: readonly IFarmAnimation[],
  time: number,
) {
  return Math.min(
    ...animations.map((animation) => getNextChangeOf(animation, time)),
  );
}

export function earliestChange(
  nextChanges: readonly TNextChange[],
): TNextChange {
  return (time) =>
    Math.min(...nextChanges.map((nextChange) => nextChange(time)));
}

export function changesBetween(
  nextChange: TNextChange,
  from: number,
  to: number,
) {
  return nextChange(Math.min(from, to)) <= Math.max(from, to);
}
