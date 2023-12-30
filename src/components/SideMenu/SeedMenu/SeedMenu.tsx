import cn from "clsx";
import { For, Show } from "solid-js";

import { crops } from "../../../data/sdv.json";
import { getSeason, getYear } from "../../../helpers/date";
import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

interface IProps {
  date: number;
  isVisible: boolean;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

export default function SeedMenu(props: IProps) {
  const cropIds = Object.keys(crops).sort((a, b) => a.localeCompare(b));

  const getLastDayOfYearForCrop = (crop: ICrop) => {
    let lastDay = 0;

    if (crop.seasons.includes("spring")) {
      lastDay = 28 * 1;
    }

    if (crop.seasons.includes("summer")) {
      lastDay = 28 * 2;
    }

    if (crop.seasons.includes("fall")) {
      lastDay = 28 * 3;
    }

    if (crop.seasons.includes("winter")) {
      lastDay = 28 * 4;
    }

    lastDay += getYear(props.date) * 28 * 4;

    return lastDay;
  };

  const calculateProfit = (crop: ICrop) => {
    const lastDay = getLastDayOfYearForCrop(crop);

    const daysUntilFirstHarvest = crop.stages.reduce(
      (acc, stage) => acc + stage,
      0
    );

    const harvests =
      crop.regrow === undefined
        ? Math.ceil(
            (lastDay - props.date - daysUntilFirstHarvest) /
              daysUntilFirstHarvest
          )
        : Math.ceil(
            (lastDay - props.date - daysUntilFirstHarvest) / crop.regrow
          );

    return (
      crop.sell * harvests * (crop.harvest.min || 1) -
      crop.buy * (crop.regrow === undefined ? harvests : 1)
    );
  };

  const calculateProfitPerDay = (crop: ICrop) =>
    Math.round(
      (calculateProfit(crop) / (getLastDayOfYearForCrop(crop) - props.date)) *
        100
    ) / 100;

  return (
    <Show when={props.isVisible}>
      <div class="SeedMenu sdv-list">
        <For
          each={cropIds
            .filter((cropId) => !crops[cropId].isIndoorsOnly)
            .filter(
              (cropId) =>
                crops[cropId] &&
                crops[cropId].seasons.find(
                  (season) =>
                    season ===
                    ["spring", "summer", "fall", "winter"][
                      getSeason(props.date)
                    ]
                )
            )
            .sort((a, b) => a.localeCompare(b))}
        >
          {(cropId) => (
            <div
              class={cn("sdv-list-item", {
                selected:
                  props.selectedItem !== undefined &&
                  props.selectedItem.type === "crop" &&
                  props.selectedItem.id === cropId,
              })}
              data-testid={`seed--${cropId}`}
              // tslint:disable-next-line:jsx-no-lambda
              onClick={() => {
                props.selectCrop(cropId);
              }}
              title={
                `Cost: ${crops[cropId].buy}g\n` +
                `Sell: ${crops[cropId].sell}g\n` +
                `Profit: ${calculateProfit(crops[cropId])}g\n` +
                `Profit/day: ${calculateProfitPerDay(crops[cropId])}g`
              }
            >
              <div class="sdv-list-item-icon">
                <Sprite
                  height={16}
                  src="images/seeds.png"
                  width={16}
                  x={cropIds.indexOf(cropId) * 16}
                  y={0}
                />
              </div>
              <div class="sdv-list-item-text">
                <BigText>{crops[cropId].name}</BigText>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
