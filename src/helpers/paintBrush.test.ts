import { buildings } from "../data/game/buildings.json";
import {
  brushRanges,
  defaultBrushColor,
  getBrushSwatch,
  getTrackColors,
  getTrackGradient,
  paintRegions,
  toPaintColors,
} from "./paintBrush";

function getPaint(buildingId: string) {
  const { paint } = buildings[buildingId];

  if (paint === undefined) {
    throw new Error(`The ${buildingId} in buildings.json has no paint`);
  }

  return paint;
}

const housePaint = getPaint("farmhouse");

const allRegions = (color: IBrushColor): TBrushColors => ({
  Building: color,
  Roof: color,
  Trim: color,
});

describe("the paint brush", () => {
  it("has the 3 regions of the game, with their names from the export", () => {
    expect(paintRegions).toEqual([
      { id: "Building", name: "Building" },
      { id: "Roof", name: "Roof" },
      { id: "Trim", name: "Trim" },
    ]);
  });

  it("has the hue and saturation ranges of the game, and the place of the lightness slider", () => {
    expect(brushRanges).toEqual({
      hue: { max: 360, min: 0 },
      lightness: { max: 100, min: 0 },
      saturation: { max: 75, min: 0 },
    });
  });

  it("starts each region at the first hue, the most saturation and the middle lightness, as the game does", () => {
    expect(defaultBrushColor).toEqual({
      hue: 0,
      lightness: 50,
      saturation: 75,
    });
  });
});

describe("toPaintColors", () => {
  it("puts the middle of the slider at the middle of each region's lightness range, rounded as the game does", () => {
    expect(toPaintColors(allRegions(defaultBrushColor), housePaint)).toEqual({
      Building: { hue: 0, lightness: -30, saturation: 75 },
      Roof: { hue: 0, lightness: -12, saturation: 75 },
      Trim: { hue: 0, lightness: -16, saturation: 75 },
    });
  });

  it("puts the ends of the slider at the ends of the range of the building", () => {
    const dark = { hue: 120, lightness: 0, saturation: 40 };
    const light = { ...dark, lightness: 100 };

    expect(toPaintColors({ Building: dark }, housePaint)).toEqual({
      Building: { hue: 120, lightness: -50, saturation: 40 },
    });
    expect(toPaintColors({ Building: light }, housePaint)).toEqual({
      Building: { hue: 120, lightness: -10, saturation: 40 },
    });
    expect(toPaintColors({ Building: light }, getPaint("stable"))).toEqual({
      Building: { hue: 120, lightness: 5, saturation: 40 },
    });
  });

  it("gives no colour to a region with no paint, and none to a region that the building does not have", () => {
    expect(
      toPaintColors(
        { Chimney: defaultBrushColor, Roof: defaultBrushColor },
        housePaint,
      ),
    ).toEqual({ Roof: { hue: 0, lightness: -12, saturation: 75 } });
  });

  it("keeps the colours in the ranges of the paint data", () => {
    expect(
      toPaintColors(
        { Roof: { hue: 400, lightness: 150, saturation: 90 } },
        housePaint,
      ),
    ).toEqual({ Roof: { hue: 360, lightness: 0, saturation: 75 } });
  });
});

describe("the menu colours", () => {
  it("shows the swatch with the lightness from 25% to 50%, as the game does", () => {
    expect(getBrushSwatch(defaultBrushColor)).toBe("rgb(167, 23, 23)");
    expect(getBrushSwatch({ hue: 0, lightness: 100, saturation: 0 })).toBe(
      "rgb(127, 127, 127)",
    );
  });

  it("draws each slider as 20 blocks: all hues, the saturations of the hue and the lightnesses of the colour", () => {
    const green = { hue: 120, lightness: 50, saturation: 75 };
    const hues = getTrackColors("hue", green);
    const saturations = getTrackColors("saturation", green);
    const lightnesses = getTrackColors("lightness", green);

    expect([hues.length, saturations.length, lightnesses.length]).toEqual([
      20, 20, 20,
    ]);
    expect([hues[0], hues[10]]).toEqual(["rgb(255, 0, 0)", "rgb(0, 255, 255)"]);
    expect(saturations[0]).toBe("rgb(127, 127, 127)");
    expect(lightnesses[10]).toBe(getBrushSwatch(green));
  });

  it("makes a gradient with a hard stop between the blocks", () => {
    expect(getTrackGradient(["red", "blue"])).toBe(
      "linear-gradient(to right, red 0% 50%, blue 50% 100%)",
    );
  });
});
