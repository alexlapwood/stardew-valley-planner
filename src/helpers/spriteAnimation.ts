export function getAnimationFrame(
  { frameDuration, frames }: ISpriteAnimation,
  time: number,
) {
  return frames[Math.floor(time / frameDuration) % frames.length];
}

export function getAnimationNextChange(
  { frameDuration, frames }: ISpriteAnimation,
  time: number,
) {
  return frames.length > 1
    ? (Math.floor(time / frameDuration) + 1) * frameDuration
    : Infinity;
}

// With no time, the map does not animate, and the sprite is still.
export function getSpriteAt(
  still: TSpriteRect,
  animation: ISpriteAnimation | undefined,
  time: number | undefined,
) {
  return animation === undefined || time === undefined
    ? still
    : getAnimationFrame(animation, time);
}
