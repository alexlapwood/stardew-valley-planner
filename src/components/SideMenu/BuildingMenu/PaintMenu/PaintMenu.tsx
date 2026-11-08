import { For } from "solid-js";

import {
  brushRanges,
  defaultBrushColor,
  getBrushSwatch,
  getTrackColors,
  getTrackGradient,
  paintRegions,
  type TBrushChannel,
} from "../../../../helpers/paintBrush";
import BigText from "../../../BigText/BigText";

interface IProps {
  changeColors: (colors: TBrushColors) => void;
  colors: TBrushColors;
}

interface IChannel {
  channel: TBrushChannel;
  letter: string;
  name: string;
}

const channels: readonly IChannel[] = [
  { channel: "hue", letter: "H", name: "hue" },
  { channel: "saturation", letter: "S", name: "saturation" },
  { channel: "lightness", letter: "L", name: "lightness" },
];

// The sliders of each region, as in the game's paint menu (SV ›
// BuildingPaintMenu). A region with no paint shows the sliders where the
// game starts them, and the first move of a slider paints the region.
export default function PaintMenu(props: IProps) {
  const getShownColor = (regionId: string) =>
    props.colors[regionId] ?? defaultBrushColor;

  const changeRegion = (regionId: string, color?: IBrushColor) => {
    const { [regionId]: _color, ...otherRegions } = props.colors;

    props.changeColors(
      color === undefined
        ? otherRegions
        : { ...otherRegions, [regionId]: color },
    );
  };

  return (
    <div class="PaintMenu" data-testid="paint-menu">
      <For each={paintRegions}>
        {(region) => {
          const hasPaint = () => props.colors[region.id] !== undefined;

          return (
            <div
              aria-label={region.name}
              class="PaintMenu--region"
              data-testid={`paint-region--${region.id}`}
              role="group"
            >
              <div class="PaintMenu--heading">
                <div class="flex">
                  <BigText>{region.name}</BigText>
                </div>
                <div
                  class="PaintMenu--swatch"
                  classList={{ hidden: !hasPaint() }}
                  data-testid={`paint-swatch--${region.id}`}
                  style={{
                    "background-color": getBrushSwatch(
                      getShownColor(region.id),
                    ),
                  }}
                />
                <label class="PaintMenu--no-paint">
                  <input
                    aria-label={`${region.name}: no paint`}
                    checked={!hasPaint()}
                    data-testid={`paint-no-paint--${region.id}`}
                    onChange={(event) => {
                      changeRegion(
                        region.id,
                        event.currentTarget.checked
                          ? undefined
                          : getShownColor(region.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <BigText>No paint</BigText>
                </label>
              </div>
              <For each={channels}>
                {({ channel, letter, name }) => (
                  <div class="PaintMenu--slider-row">
                    <div aria-hidden="true" class="PaintMenu--letter">
                      <BigText>{letter}</BigText>
                    </div>
                    <input
                      aria-label={`${region.name} ${name}`}
                      class="PaintMenu--slider"
                      data-testid={`paint-slider--${region.id}--${channel}`}
                      max={brushRanges[channel].max}
                      min={brushRanges[channel].min}
                      onInput={(event) => {
                        changeRegion(region.id, {
                          ...getShownColor(region.id),
                          [channel]: Number(event.currentTarget.value),
                        });
                      }}
                      step="1"
                      style={{
                        "--track": getTrackGradient(
                          getTrackColors(channel, getShownColor(region.id)),
                        ),
                      }}
                      type="range"
                      value={getShownColor(region.id)[channel]}
                    />
                  </div>
                )}
              </For>
            </div>
          );
        }}
      </For>
    </div>
  );
}
