import * as React from "react";

import * as cn from "classnames";

import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

import { getSeason } from "../../../helpers/date";

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
