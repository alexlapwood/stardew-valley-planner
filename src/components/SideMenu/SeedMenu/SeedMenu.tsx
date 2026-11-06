import cn from "clsx";
import { For } from "solid-js";

import { crops } from "../../../data/game/crops.json";
import { atlasSprite } from "../../../helpers/atlas";
import { getSeedCost } from "../../../helpers/crop";
import { getCropIncome, getCropProfit } from "../../../helpers/cropIncome";
import { formatIncomeTooltip } from "../../../helpers/income";
import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

interface IProps {
  cropIds: string[];
  date: number;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

export default function SeedMenu(props: IProps) {
  const getTooltip = (crop: ICrop) =>
    formatIncomeTooltip({
      cost: getSeedCost(crop),
      income: getCropIncome(crop, props.date),
      profit: getCropProfit(crop, props.date),
      sell: crop.sell,
    });

  return (
    <div class="SeedMenu">
      <For each={props.cropIds}>
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
  );
}
