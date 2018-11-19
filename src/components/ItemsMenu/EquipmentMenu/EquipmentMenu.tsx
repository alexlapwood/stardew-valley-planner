import * as React from "react";

import * as cn from "classnames";

import { getSeason } from "../../../helpers/date";
import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";

// tslint:disable-next-line:no-var-requires
const { equipment, equipmentIds } = require("../../../data/sdv.json") as {
  equipment: { [index: string]: IEquipment };
  equipmentIds: string[];
};

interface IProps {
  date: number;
  isVisible: boolean;
  range?: { from?: number; to?: number };
  selectEquipment: (equipmentId: string, skinIndex: number) => void;
  selectedItem?: ISelectedItem;
}

interface IState {
  currentSkins: {
    [index: string]: number;
  };
}

class EquipmentMenu extends React.PureComponent<IProps, IState> {
  public state: IState = {
    currentSkins: {}
  };

  public render() {
    const {
      date,
      isVisible,
      range,
      selectEquipment,
      selectedItem
    } = this.props;

    return isVisible ? (
      <div className="EquipmentMenu sdv-list">
        {equipmentIds
          .filter((_, i) => {
            if (range !== undefined) {
              if (range.from !== undefined && i < range.from) {
                return false;
              }
              if (range.to !== undefined && i > range.to) {
                return false;
              }
            }
            return true;
          })
          .map(equipmentId => {
            let sprite;

            let equipmentIndex = equipmentIds
              .slice(0, equipmentIds.indexOf(equipmentId))
              .reduce((acc, id) => {
                if (id === "fence" || id === "flooring") {
                  return acc;
                }

                if (equipment[id].isSeasonal) {
                  return acc + equipment[id].skins.length * 4;
                }

                return acc + equipment[id].skins.length;
              }, 0);

            const skinIndex = this.state.currentSkins[equipmentId] || 0;

            if (equipment[equipmentId].isSeasonal) {
              equipmentIndex = equipmentIndex + skinIndex * 4 + getSeason(date);
            } else {
              equipmentIndex = equipmentIndex + skinIndex;
            }

            switch (equipmentId) {
              case "sprinkler":
                sprite = (
                  <Sprite
                    height={16}
                    src="images/equipment-sheet.png"
                    width={16}
                    x={equipmentIndex * 16}
                    y={16}
                  />
                );
                break;
              case "fence":
                sprite = (
                  <div
                    style={{
                      height: "16px",
                      transform: "scale(0.5)",
                      transformOrigin: "top left",
                      whiteSpace: "nowrap",
                      width: "16px"
                    }}
                  >
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
                  <div
                    style={{
                      height: "16px",
                      transform: "scale(0.5)",
                      transformOrigin: "top center",
                      whiteSpace: "nowrap",
                      width: "16px"
                    }}
                  >
                    <Sprite
                      height={32}
                      src="images/equipment-sheet.png"
                      width={16}
                      x={equipmentIndex * 16}
                      y={0}
                    />
                  </div>
                );
                break;
            }

            return (
              <div
                className={cn("sdv-list-item", "flex-horizontal", {
                  selected:
                    selectedItem !== undefined &&
                    selectedItem.type === "equipment" &&
                    selectedItem.id === equipmentId &&
                    selectedItem.skinIndex === skinIndex
                })}
                data-automationid={`equipment--${equipmentId}`}
                key={equipmentId}
                // tslint:disable-next-line:jsx-no-lambda
                onClick={() => {
                  selectEquipment(equipmentId, skinIndex);
                }}
              >
                <div className="sdv-list-item-icon">{sprite}</div>
                <div className="sdv-list-item-text flex margin-right">
                  <BigText>{equipment[equipmentId].skins[skinIndex]}</BigText>
                </div>
                {equipment[equipmentId].skins.length > 1 && (
                  <React.Fragment>
                    <button
                      className="sdv-button-left margin-right"
                      data-automationid="equipment-button--left"
                      disabled={skinIndex <= 0}
                      // tslint:disable-next-line:jsx-no-lambda
                      onClick={e => {
                        e.stopPropagation();
                        selectEquipment(equipmentId, skinIndex - 1);
                        this.setState({
                          currentSkins: {
                            ...this.state.currentSkins,
                            [equipmentId]: skinIndex - 1
                          }
                        });
                      }}
                    />
                    <button
                      className="sdv-button-right margin-right"
                      data-automationid="equipment-button--right"
                      disabled={
                        skinIndex >= equipment[equipmentId].skins.length - 1
                      }
                      // tslint:disable-next-line:jsx-no-lambda
                      onClick={e => {
                        e.stopPropagation();
                        selectEquipment(equipmentId, skinIndex + 1);
                        this.setState({
                          currentSkins: {
                            ...this.state.currentSkins,
                            [equipmentId]: skinIndex + 1
                          }
                        });
                      }}
                    />
                  </React.Fragment>
                )}
              </div>
            );
          })}
      </div>
    ) : null;
  }
}

export default EquipmentMenu;
