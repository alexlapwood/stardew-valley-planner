import { buildings } from "../data/game/buildings.json";
import { hslToRgb } from "./paintedSprites";

export interface IPaintRegionName {
  id: string;
  name: string;
}

export type TBrushChannel = keyof IBrushColor;

const allPaints = Object.values(buildings).flatMap((building) =>
  [
    building.paint,
    ...Object.values(building.skins ?? {}).map((skin) => skin?.paint),
  ].filter((paint) => paint !== undefined),
);

// The game's sliders, for when the export has no paint (SV ›
// BuildingPaintMenu.ColorSliderPanel.Reposition).
const gameRanges = {
  hue: { max: 360, min: 0 },
  saturation: { max: 75, min: 0 },
};

function uniteRanges(
  ranges: readonly IPaintRange[],
  fallback: IPaintRange,
): IPaintRange {
  return ranges.length === 0
    ? fallback
    : {
        max: Math.max(...ranges.map(({ max }) => max)),
        min: Math.min(...ranges.map(({ min }) => min)),
      };
}

export const brushRanges: Record<TBrushChannel, IPaintRange> = {
  hue: uniteRanges(
    allPaints.map(({ hue }) => hue),
    gameRanges.hue,
  ),
  lightness: { max: 100, min: 0 },
  saturation: uniteRanges(
    allPaints.map(({ saturation }) => saturation),
    gameRanges.saturation,
  ),
};

// Each building has the same regions in the same order, so the menu shows each
// region 1 time.
export const paintRegions: readonly IPaintRegionName[] = [
  ...new Map(
    allPaints
      .flatMap(({ regions }) => regions)
      .map(({ id, name }): [string, IPaintRegionName] => [id, { id, name }]),
  ).values(),
];

// As in the game, a region with no paint shows the sliders at the first hue,
// the most saturation and the middle lightness (SV ›
// BuildingPaintMenu.ColorSliderPanel.Reposition).
export const defaultBrushColor: IBrushColor = {
  hue: brushRanges.hue.min,
  lightness: (brushRanges.lightness.min + brushRanges.lightness.max) / 2,
  saturation: brushRanges.saturation.max,
};

const clamp = (value: number, { max, min }: IPaintRange) =>
  Math.min(Math.max(value, min), max);

// The brush keeps the place of the lightness slider, and each building puts
// it in its own range, as the game does for a saved colour (SV ›
// BuildingPaintMenu.receiveLeftClick).
function toRegionLightness(place: number, { max, min }: IPaintRange) {
  const { lightness } = brushRanges;
  const steps = lightness.max - lightness.min;
  const share = clamp(place, lightness) - lightness.min;

  return Math.trunc((min * steps + (max - min) * share) / steps);
}

export function toPaintColors(
  brush: TBrushColors,
  paint: IBuildingPaint,
): TPaintColors {
  return Object.fromEntries(
    paint.regions.flatMap(({ id, lightness }): [string, IPaintColor][] => {
      const color = brush[id];

      return color === undefined
        ? []
        : [
            [
              id,
              {
                hue: clamp(color.hue, paint.hue),
                lightness: toRegionLightness(color.lightness, lightness),
                saturation: clamp(color.saturation, paint.saturation),
              },
            ],
          ];
    }),
  );
}

const toCss = ([red, green, blue]: readonly number[]) =>
  `rgb(${red}, ${green}, ${blue})`;

const lerp = (start: number, end: number, share: number) =>
  start + (end - start) * share;

// The menu shows the lightness from 25% to 50%, as the game does (SV ›
// BuildingPaintMenu.ColorSliderPanel.GetColorForValues).
export function getBrushSwatch({ hue, lightness, saturation }: IBrushColor) {
  const { max, min } = brushRanges.lightness;

  return toCss(
    hslToRgb(
      hue,
      saturation / 100,
      lerp(0.25, 0.5, (lightness - min) / (max - min)),
    ),
  );
}

const trackBlocks = 20;

// The game draws each slider as 20 blocks of colour (SV ›
// BuildingPaintMenu.BuildingColorSlider.Draw).
export function getTrackColors(channel: TBrushChannel, color: IBrushColor) {
  const { max, min } = brushRanges[channel];

  return Array.from({ length: trackBlocks }, (_, block) => {
    const value = lerp(min, max, block / trackBlocks);

    if (channel === "hue") {
      return toCss(hslToRgb(value, 1, 0.5));
    }

    return channel === "saturation"
      ? toCss(hslToRgb(color.hue, value / 100, 0.5))
      : getBrushSwatch({ ...color, lightness: value });
  });
}

export function getTrackGradient(colors: readonly string[]) {
  const width = 100 / colors.length;
  const stops = colors.map(
    (color, index) => `${color} ${index * width}% ${(index + 1) * width}%`,
  );

  return `linear-gradient(to right, ${stops.join(", ")})`;
}
