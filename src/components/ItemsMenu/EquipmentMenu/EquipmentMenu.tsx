import * as React from "react";

import * as cn from "classnames";

import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

// tslint:disable-next-line:no-var-requires
const equipment: IEquipment = require("../../../data/sdv.json").equipment;

interface IProps {
  isVisible: boolean;
  selectEquipment: (equipmentId: string, skinIndex: number) => void;
  selectedItem?: ISelectedItem;
}

const EquipmentMenu: React.SFC<IProps> = props => {
  const { isVisible, selectEquipment, selectedItem } = props;

  return isVisible ? (
    <div className="sdv-list">
      {Object.keys(equipment).map((equipmentId, equipmentIndex) =>
        equipment[equipmentId].skins.map((skin, skinIndex) => (
          <div
            className={cn("sdv-list-item", {
              selected:
                selectedItem !== undefined &&
                selectedItem.type === "equipment" &&
                selectedItem.id === equipmentId &&
                selectedItem.skinIndex === skinIndex
            })}
            key={skin}
            // tslint:disable-next-line:jsx-no-lambda
            onClick={() => {
              selectEquipment(equipmentId, skinIndex);
            }}
          >
            <div className="sdv-list-item-icon">
              <Sprite
                height={16}
                src="images/equipment.png"
                width={16}
                x={equipmentIndex * 16}
                y={(equipmentId === "scarecrow" ? 16 : 32) + skinIndex * 32}
              />
            </div>
            <div className="sdv-list-item-text">
              <BigText>{skin}</BigText>
            </div>
          </div>
        ))
      )}
    </div>
  ) : null;
};

export default EquipmentMenu;
