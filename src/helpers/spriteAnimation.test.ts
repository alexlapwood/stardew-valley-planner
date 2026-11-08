import { buildings } from "../data/game/buildings.json";
import {
  getAnimationFrame,
  getAnimationNextChange,
  getSpriteAt,
} from "./spriteAnimation";

const millSprite = buildings.mill.sprite;

function getMillAnimation() {
  const { animation } = millSprite;

  if (animation === undefined) {
    throw new Error("The mill in buildings.json has no animation");
  }

  return animation;
}

const mill = getMillAnimation();

describe("the mill animation", () => {
  it("has 10 frames of 90 ms, the first one the still sprite", () => {
    expect(mill.frameDuration).toBe(90);
    expect(mill.frames).toHaveLength(10);
    expect(mill.frames[0]).toEqual(millSprite.sprite);
  });
});

describe("getAnimationFrame", () => {
  it.each([
    [0, 0],
    [89, 0],
    [90, 1],
    [450, 5],
    [899, 9],
    [900, 0],
    [1000, 1],
  ])("shows at %i ms frame ⌊t / 90⌋ mod 10 = %i", (time, frame) => {
    expect(getAnimationFrame(mill, time)).toBe(mill.frames[frame]);
  });
});

describe("getAnimationNextChange", () => {
  it.each([
    [0, 90],
    [89, 90],
    [90, 180],
    [899, 900],
  ])("changes after %i ms at %i ms", (time, next) => {
    expect(getAnimationNextChange(mill, time)).toBe(next);
  });

  it("never changes with 1 frame", () => {
    expect(
      getAnimationNextChange({ ...mill, frames: [millSprite.sprite] }, 0),
    ).toBe(Infinity);
  });
});

describe("getSpriteAt", () => {
  it("gives the frame of the animation at the time", () => {
    expect(getSpriteAt(millSprite.sprite, mill, 90)).toBe(mill.frames[1]);
  });

  it.each([
    ["there is no time", mill, undefined],
    ["the sprite has no animation", undefined, 90],
  ])("gives the still sprite when %s", (_, animation, time) => {
    expect(getSpriteAt(millSprite.sprite, animation, time)).toBe(
      millSprite.sprite,
    );
  });
});
