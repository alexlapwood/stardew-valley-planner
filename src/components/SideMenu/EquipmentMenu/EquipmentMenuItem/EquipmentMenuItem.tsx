import React from "react";

import cn from "classnames";

import { getSeason } from "../../../../helpers/date";
import BigText from "../../../BigText/BigText";
import Sprite from "../../../Sprite/Sprite";

// tslint:disable-next-line:no-var-requires
const { equipment, equipmentIds } = require("../../../../data/sdv.json") as {
  equipment: { [index: string]: IEquipment };
  equipmentIds: string[];
};

interface IProps {
  date: number;
  equipmentId: string;
  selectEquipment: (equipmentId: string, skinIndex: number) => void;
  selectedItem?: ISelectedItem;
}

interface IState {
  currentSkinIndex: number;
  open: boolean;
}

class EquipmentMenuItem extends React.Component<IProps, IState> {
  public state: IState = {
    currentSkinIndex: 0,
    open: false
  };

  public render() {
    return (
      <div>
        {this.renderPickItem(this.state.currentSkinIndex, true)}
        {this.state.open && this.renderPicklist()}
      </div>
    );
  }

  private close = () => {
    this.setState({ open: false });
  };

  private open = () => {
    this.setState({ open: true });
  };

  private toggle = () => {
    if (this.state.open) {
      this.close();
    } else {
      this.open();
    }
  };

  private renderPicklist = () => {
    const { equipmentId } = this.props;

    return equipment[equipmentId].skins.map((skinId, skinIndex) => (
      <div className="margin-left" key={skinId}>
        {this.renderPickItem(skinIndex)}
      </div>
    ));
  };

  private renderPickItem = (skinIndex: number, isTrigger?: boolean) => {
    const { equipmentId, date, selectEquipment, selectedItem } = this.props;

    let sprite: JSX.Element;

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
        data-automationid={`equipment-${equipmentId}--${skinIndex}`}
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => {
          this.setState({ currentSkinIndex: skinIndex });
          selectEquipment(equipmentId, skinIndex);
        }}
      >
        <div className="sdv-list-item-icon">{sprite}</div>
        <div className="sdv-list-item-text flex margin-right">
          <BigText>{equipment[equipmentId].skins[skinIndex]}</BigText>
        </div>

        {isTrigger && equipment[equipmentId].skins.length > 1 && (
          <React.Fragment>
            <button
              className={cn("margin-right", {
                "sdv-button-down": !this.state.open,
                "sdv-button-up": this.state.open
              })}
              data-automationid="equipment-dropdown--trigger"
              // tslint:disable-next-line:jsx-no-lambda
              onClick={e => {
                e.stopPropagation();
                this.toggle();
              }}
            />
          </React.Fragment>
        )}
      </div>
    );
  };
}

export default EquipmentMenuItem;
