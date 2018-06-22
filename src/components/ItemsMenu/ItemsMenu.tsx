import * as React from "react";

import * as cn from "classnames";

import BigText from "../BigText/BigText";
import Sprite from "../Sprite/Sprite";

import { getSeason } from "../../helpers/date";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../../data/sdv.json").crops;

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

const ItemsMenu: React.SFC<IProps> = props => {
  const { date, selectCrop, selectedItem } = props;

  return (
    <div className="sdv-list">
      {crops.map((crop, i) => {
        if (
          crop &&
          crop.seasons.find(
            season =>
              season === ["spring", "summer", "fall", "winter"][getSeason(date)]
          )
        ) {
          return (
            <div
              className={cn("sdv-list-item", {
                selected:
                  selectedItem !== undefined &&
                  selectedItem.type === "crop" &&
                  selectedItem.id === crop.id
              })}
              key={crop.id}
              // tslint:disable-next-line:jsx-no-lambda
              onClick={() => {
                selectCrop(crop.id);
              }}
            >
              <div className="sdv-list-item-icon">
                <Sprite
                  height={16}
                  src="/images/seeds.png"
                  width={16}
                  x={i * 16}
                  y={0}
                />
              </div>
              <div className="sdv-list-item-text">
                <BigText>{crop.name}</BigText>
              </div>
            </div>
          );
        }
        return;
      })}
    </div>
  );
};

export default ItemsMenu;
