import cn from "clsx";
import { For, Show } from "solid-js";

import { crops } from "../../../data/game/crops.json";
import { atlasSprite } from "../../../helpers/atlas";
import { getSeedCost, isInSeedMenu } from "../../../helpers/crop";
import { getSeasonName, getYear } from "../../../helpers/date";
import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

interface IProps {
  date: number;
  isVisible: boolean;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

export default function SeedMenu(props: IProps) {
  const cropIds = Object.keys(crops).toSorted((a, b) => a.localeCompare(b));

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
      0,
    );

    const harvests =
      crop.regrow === undefined
        ? Math.ceil(
            (lastDay - props.date - daysUntilFirstHarvest) /
              daysUntilFirstHarvest,
          )
        : Math.ceil(
            (lastDay - props.date - daysUntilFirstHarvest) / crop.regrow,
          );

    const seedCost = getSeedCost(crop)?.cost ?? 0;

    return (
      crop.sell * harvests * crop.harvest.min -
      seedCost * (crop.regrow === undefined ? harvests : 1)
    );
  };

  const calculateProfitPerDay = (crop: ICrop) =>
    Math.round(
      (calculateProfit(crop) / (getLastDayOfYearForCrop(crop) - props.date)) *
        100,
    ) / 100;

  const getTooltip = (crop: ICrop) => {
    const seedCost = getSeedCost(crop);

    return (
      (seedCost === undefined ? "" : `Cost: ${seedCost.label}\n`) +
      `Sell: ${crop.sell}g\n` +
      `Profit: ${calculateProfit(crop)}g\n` +
      `Profit/day: ${calculateProfitPerDay(crop)}g`
    );
  };

  return (
    <Show when={props.isVisible}>
      <div class="SeedMenu sdv-list">
        <For
          each={cropIds
            .filter((cropId) => isInSeedMenu(crops[cropId]))
            .filter((cropId) =>
              crops[cropId].seasons.includes(getSeasonName(props.date)),
            )}
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
              onClick={() => {
                props.selectCrop(cropId);
              }}
              title={getTooltip(crops[cropId])}
            >
              <div class="sdv-list-item-icon">
                <Sprite {...atlasSprite("crops", crops[cropId].sprites.seed)} />
              </div>
              <div>
                <BigText>{crops[cropId].name}</BigText>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
