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
    <div className="EquipmentMenu sdv-list">
      {Object.keys(equipment).map((equipmentId, equipmentIndex) =>
        equipment[equipmentId].skins.map((skin, skinIndex) => {
          let sprite;

          switch (equipmentId) {
            case "scarecrow":
              sprite = (
                <Sprite
                  height={16}
                  src="images/equipment.png"
                  width={16}
                  x={equipmentIndex * 16}
                  y={16 + skinIndex * 32}
                />
              );
              break;
            case "fence":
              sprite = (
                <div style={{ zoom: 0.5 }}>
                  <Sprite
                    height={32}
                    src="images/fences.png"
                    width={16}
                    x={skinIndex * 48}
                    y={0}
                  />
                  <Sprite
                    height={32}
                    src="images/fences.png"
                    width={16}
                    x={skinIndex * 48 + 32}
                    y={0}
                  />
                </div>
              );
              break;
            case "flooring":
              sprite = (
                <div>
                  <Sprite
                    height={16}
                    src="images/flooring.png"
                    width={16}
                    x={(skinIndex % 4) * 64}
                    y={Math.floor(skinIndex / 4) * 64}
                  />
                </div>
              );
              break;
            default:
              sprite = (
                <Sprite
                  height={16}
                  src="images/equipment.png"
                  width={16}
                  x={equipmentIndex * 16}
                  y={32 + skinIndex * 32}
                />
              );
              break;
          }

          return (
            <div
              className={cn("sdv-list-item", {
                selected:
                  selectedItem !== undefined &&
                  selectedItem.type === "equipment" &&
                  selectedItem.id === equipmentId &&
                  selectedItem.skinIndex === skinIndex
              })}
              data-automationid={`equipment--${equipmentId}`}
              key={skin}
              // tslint:disable-next-line:jsx-no-lambda
              onClick={() => {
                selectEquipment(equipmentId, skinIndex);
              }}
            >
              <div className="sdv-list-item-icon">{sprite}</div>
              <div className="sdv-list-item-text">
                <BigText>{skin}</BigText>
              </div>
            </div>
          );
        })
      )}
    </div>
  ) : null;
};

export default EquipmentMenu;
