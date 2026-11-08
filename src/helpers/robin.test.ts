import { robin } from "../data/game/robin.json";
import {
  getRobinSprite,
  getSwingFrame,
  getSwingNextChange,
  hammerSwing,
  makeHammerSwing,
} from "./robin";

describe("the hammer data", () => {
  it("swings with frames 24, 25 and 26, then pauses on frame 27 or 23 (SV › NPC.doPlayRobinHammerAnimation, robinVariablePause)", () => {
    expect(
      robin.hammer
        .slice(0, 3)
        .map(({ choices }) =>
          choices.map(({ frame, maxMs, minMs }) => [frame, minMs, maxMs]),
        ),
    ).toEqual([[[24, 75, 75]], [[25, 75, 75]], [[26, 300, 300]]]);
    expect(robin.hammer[3].choices).toEqual([
      { chance: 0.4, frame: 27, maxMs: 300, minMs: 300 },
      { chance: 0.15, frame: 23, maxMs: 3999, minMs: 500 },
      { chance: 0.45, frame: 27, maxMs: 3999, minMs: 1000 },
    ]);
  });
});

describe("hammerSwing", () => {
  it("is frames 24, 25, 26 and the short pause on 27, with no long pause", () => {
    expect(hammerSwing).toEqual({
      frames: [
        { frame: 24, start: 0 },
        { frame: 25, start: 75 },
        { frame: 26, start: 150 },
        { frame: 27, start: 450 },
      ],
      length: 750,
    });
  });

  it("takes the shortest choice of each step, and leaves out a step with no time", () => {
    expect(
      makeHammerSwing([
        {
          choices: [
            { chance: 0.5, frame: 23, maxMs: 900, minMs: 500 },
            { chance: 0.5, frame: 27, maxMs: 300, minMs: 200 },
          ],
        },
        { choices: [{ chance: 1, frame: 24, maxMs: 0, minMs: 0 }] },
        { choices: [] },
      ]),
    ).toEqual({ frames: [{ frame: 27, start: 0 }], length: 200 });
  });

  it.each([
    [0, 24, 75],
    [74.5, 24, 75],
    [75, 25, 150],
    [150, 26, 450],
    [449, 26, 450],
    [450, 27, 750],
    [749, 27, 750],
  ])("at %d ms shows frame %i until %d ms", (time, frame, nextChange) => {
    expect(getSwingFrame(hammerSwing, time)).toBe(frame);
    expect(getSwingNextChange(hammerSwing, time)).toBe(nextChange);
  });
});

describe("getRobinSprite", () => {
  it("uses the winter sprite in winter and the base sprite in other seasons", () => {
    expect(getRobinSprite(24, "winter")).toEqual(
      robin.frames[24]?.seasons?.winter,
    );
    expect(getRobinSprite(24, "summer")).toEqual(robin.frames[24]?.sprite);
    expect(getRobinSprite(99, "spring")).toBeUndefined();
  });
});
