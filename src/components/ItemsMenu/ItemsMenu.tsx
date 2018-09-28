import * as React from "react";

import * as cn from "classnames";

import Sprite from "../Sprite/Sprite";
import EquipmentMenu from "./EquipmentMenu/EquipmentMenu";
import SeedMenu from "./SeedMenu/SeedMenu";

import "./ItemsMenu.css";

type TCurrentMenu = "crops" | "equipment";

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectEquipment: (equipmentId: string, equipmentIndex: number) => void;
  selectedItem?: ISelectedItem;
}

interface IState {
  currentMenu: TCurrentMenu;
}

class ItemsMenu extends React.Component<IProps, IState> {
  public state: IState = {
    currentMenu: "crops"
  };

  public render() {
    const { date, selectCrop, selectEquipment, selectedItem } = this.props;

    const showCrops = () => {
      this.setState({
        currentMenu: "crops"
      });
    };

    const showEquipment = () => {
      this.setState({
        currentMenu: "equipment"
      });
    };

    return (
      <div className="ItemsMenu flex-vertical">
        <div className="flex-horizontal flex-no-shrink">
          <div
            className={cn("sdv-tab", {
              selected: this.state.currentMenu === "crops"
            })}
            onClick={showCrops}
          >
            <Sprite
              height={16}
              src="images/seeds.png"
              width={16}
              x={16}
              y={0}
            />
          </div>
          <div
            className={cn("sdv-tab", {
              selected: this.state.currentMenu === "equipment"
            })}
            onClick={showEquipment}
          >
            <Sprite
              height={16}
              src="images/equipment.png"
              width={16}
              x={0}
              y={0}
            />
          </div>
        </div>
        <EquipmentMenu
          isVisible={this.state.currentMenu === "equipment"}
          selectEquipment={selectEquipment}
          selectedItem={selectedItem}
        />
        <SeedMenu
          date={date}
          isVisible={this.state.currentMenu === "crops"}
          selectCrop={selectCrop}
          selectedItem={selectedItem}
        />
      </div>
    );
  }
}

export default ItemsMenu;
