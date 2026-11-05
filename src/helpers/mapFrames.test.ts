import {
  changesBetween,
  earliestChange,
  getFrameIndex,
  getNextFrameChange,
  noChange,
} from "./mapFrames";

function animation(interval: number, frameCount = 2): IFarmAnimation {
  return {
    frames: Array.from({ length: frameCount }, (_, frame) => frame + 1),
    gid: 100,
    interval,
  };
}

describe("getFrameIndex", () => {
  it.each([
    [0, 0],
    [499, 0],
    [500, 1],
    [1499, 2],
    [1500, 0],
  ])("shows the right frame at %d ms", (time, frame) => {
    expect(getFrameIndex(animation(500, 3), time)).toBe(frame);
  });
});

describe("getNextFrameChange", () => {
  it.each([
    ["the end of the first frame", [animation(500)], 0, 500],
    ["the end of the frame it is in", [animation(500)], 730, 1000],
    ["the next frame when it is on a change", [animation(500)], 1000, 1500],
    [
      "the earliest change of all the animations",
      [animation(1000), animation(450), animation(950)],
      900,
      950,
    ],
    ["no change for a one-frame animation", [animation(100, 1)], 0, Infinity],
    ["no change with no animations", [], 0, Infinity],
  ])("finds %s", (_, animations, time, next) => {
    expect(getNextFrameChange(animations, time)).toBe(next);
  });
});

describe("earliestChange", () => {
  it("finds the earliest next change of all its sources", () => {
    const nextChange = earliestChange([
      (time) => time + 300,
      noChange,
      (time) => time + 100,
    ]);

    expect(nextChange(50)).toBe(150);
  });

  it("finds no change with no sources", () => {
    expect(earliestChange([])(0)).toBe(Infinity);
  });
});

function everyHalfSecond(time: number) {
  return getNextFrameChange([animation(500)], time);
}

describe("changesBetween", () => {
  it.each([
    [0, 499, false],
    [0, 500, true],
    [520, 990, false],
    [990, 1010, true],
    [700, 700, false],
    [1200, 0, true],
    [1200, 1100, false],
  ])("from %d ms to %d ms: %s", (from, to, changes) => {
    expect(changesBetween(everyHalfSecond, from, to)).toBe(changes);
  });

  it("finds no change for a source that never changes", () => {
    expect(changesBetween(noChange, 0, 100_000)).toBe(false);
  });
});
