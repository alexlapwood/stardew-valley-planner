import React from "react";

import cn from "classnames";

import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

import { getSeason, getYear } from "../../../helpers/date";

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../../../data/sdv.json")
  .crops;

interface IProps {
  date: number;
  isVisible: boolean;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

const SeedMenu: React.SFC<IProps> = props => {
  const { date, isVisible, selectCrop, selectedItem } = props;

  const cropIds = Object.keys(crops).sort((a, b) => a.localeCompare(b));

  const getLastDayForCrop = (crop: ICrop) => {
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

    lastDay += getYear(date) * 28 * 4;

    return lastDay;
  };

  const calculateProfit = (crop: ICrop) => {
    const lastDay = getLastDayForCrop(crop);

    const daysUntilFirstHarvest = crop.stages.reduce(
      (acc, stage) => acc + stage,
      0
    );

    const harvests =
      crop.regrow === undefined
        ? Math.ceil(
            (lastDay - date - daysUntilFirstHarvest) / daysUntilFirstHarvest
          )
        : Math.ceil((lastDay - date - daysUntilFirstHarvest) / crop.regrow);

    return (
      crop.sell * harvests * (crop.harvest.min || 1) -
      crop.buy * (crop.regrow === undefined ? harvests : 1)
    );
  };

  return isVisible ? (
    <div className="SeedMenu sdv-list">
      {cropIds
        .filter(cropId => !crops[cropId].isIndoorsOnly)
        .filter(
          cropId =>
            crops[cropId] &&
            crops[cropId].seasons.find(
              season =>
                season ===
                ["spring", "summer", "fall", "winter"][getSeason(date)]
            )
        )
        .sort((a, b) => a.localeCompare(b))
        .map(cropId => (
          <div
            className={cn("sdv-list-item", {
              selected:
                selectedItem !== undefined &&
                selectedItem.type === "crop" &&
                selectedItem.id === cropId
            })}
            data-automationid={`seed--${cropId}`}
            key={cropId}
            // tslint:disable-next-line:jsx-no-lambda
            onClick={() => {
              selectCrop(cropId);
            }}
            title={
              `Cost: ${crops[cropId].buy}g\n` +
              `Sell: ${crops[cropId].sell}g\n` +
              `Profit: ${calculateProfit(crops[cropId])}g\n` +
              `Profit/day: ${Math.round(
                (calculateProfit(crops[cropId]) /
                  (getLastDayForCrop(crops[cropId]) - date)) *
                  100
              ) / 100}g`
            }
          >
            <div className="sdv-list-item-icon">
              <Sprite
                height={16}
                src="images/seeds.png"
                width={16}
                x={cropIds.indexOf(cropId) * 16}
                y={0}
              />
            </div>
            <div className="sdv-list-item-text">
              <BigText>{crops[cropId].name}</BigText>
            </div>
          </div>
        ))}
    </div>
  ) : null;
};

export default SeedMenu;
