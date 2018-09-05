import * as React from "react";

import * as cn from "classnames";

import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

// tslint:disable-next-line:no-var-requires
const equipment: IEquipment = require("../../../data/sdv.json").equipment;

interface IProps {
  selectEquipment: (equipmentId: string) => void;
  selectedItem?: ISelectedItem;
}

const EquipmentMenu: React.SFC<IProps> = props => {
  const { selectEquipment, selectedItem } = props;

  return (
    <div className="sdv-list">
      {Object.keys(equipment).map((equipmentId, i) => {
        return (
          <div
            className={cn("sdv-list-item", {
              selected:
                selectedItem !== undefined &&
                selectedItem.type === "equipment" &&
                selectedItem.id === equipmentId
            })}
            key={equipmentId}
            // tslint:disable-next-line:jsx-no-lambda
            onClick={() => {
              selectEquipment(equipmentId);
            }}
          >
            <div className="sdv-list-item-icon">
              <Sprite
                height={32}
                src="images/scarecrows.png"
                width={16}
                x={i * 16}
                y={0}
              />
            </div>
            <div className="sdv-list-item-text">
              <BigText>{equipment[equipmentId].name}</BigText>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EquipmentMenu;
