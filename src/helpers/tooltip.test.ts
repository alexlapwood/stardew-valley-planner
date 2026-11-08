import { atlasSprite } from "./atlas";
import {
  getTooltipPosition,
  getTooltipText,
  type IBox,
  splitFontRuns,
} from "./tooltip";

const view: IBox = { height: 200, width: 300, x: 100, y: 50 };
const size = { height: 30, width: 80 };

const anchorAt = (x: number, y: number): IBox => ({
  height: 16,
  width: 16,
  x,
  y,
});

describe("getTooltipPosition", () => {
  it("puts the tooltip above the anchor, at its left edge, with a 2 px gap", () => {
    expect(getTooltipPosition(size, anchorAt(150, 120), view)).toEqual({
      left: 150,
      top: 88,
    });
  });

  it("puts the tooltip below the anchor when the view has no space above it", () => {
    expect(getTooltipPosition(size, anchorAt(150, 60), view)).toEqual({
      left: 150,
      top: 78,
    });
  });

  it.each<[string, IBox, { left: number; top: number }]>([
    ["left", anchorAt(60, 120), { left: 100, top: 88 }],
    ["right", anchorAt(380, 120), { left: 320, top: 88 }],
    ["top", { height: 16, width: 16, x: 150, y: 20 }, { left: 150, top: 50 }],
    [
      "bottom",
      { height: 200, width: 16, x: 150, y: 70 },
      { left: 150, top: 220 },
    ],
  ])("keeps the tooltip in the view at the %s edge", (_, anchor, expected) => {
    expect(getTooltipPosition(size, anchor, view)).toEqual(expected);
  });

  it("keeps the start of a tooltip that is bigger than the view in the view", () => {
    expect(
      getTooltipPosition({ height: 300, width: 400 }, anchorAt(150, 120), view),
    ).toEqual({ left: 100, top: 50 });
  });

  it("does not move the tooltip into a view with no size, which is not on screen", () => {
    expect(
      getTooltipPosition(size, anchorAt(-40, 0), {
        height: 0,
        width: 0,
        x: 0,
        y: 0,
      }),
    ).toEqual({ left: -40, top: 18 });
  });
});

describe("getTooltipText", () => {
  it("puts each line on its own row, with its icon", () => {
    expect(
      getTooltipText([{ text: "Barn" }, { icon: "💰", text: "6000g" }]),
    ).toBe("Barn\n💰 6000g");
  });

  it("leaves out the icon of a line that shows a sprite in its place", () => {
    expect(
      getTooltipText([
        {
          icon: "🧱",
          sprite: atlasSprite("items", [0, 0, 16, 16]),
          text: "Wood ×350",
        },
      ]),
    ).toBe("Wood ×350");
  });
});

describe("splitFontRuns", () => {
  it("splits the text into the parts that BigText can draw and the parts that it cannot", () => {
    expect(splitFontRuns("Robin · ⏱️ 3 days")).toEqual([
      { isInFont: true, text: "Robin " },
      { isInFont: false, text: "·" },
      { isInFont: true, text: " " },
      { isInFont: false, text: "⏱️" },
      { isInFont: true, text: " 3 days" },
    ]);
  });

  it("keeps text with only font letters in 1 part", () => {
    expect(splitFontRuns("Next good day: Sp 10")).toEqual([
      { isInFont: true, text: "Next good day: Sp 10" },
    ]);
  });
});
