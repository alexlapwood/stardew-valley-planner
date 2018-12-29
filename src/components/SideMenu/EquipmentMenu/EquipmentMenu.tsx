import React from "react";

import EquipmentMenuItem from "./EquipmentMenuItem/EquipmentMenuItem";

// tslint:disable-next-line:no-var-requires
const { equipmentIds } = require("../../../data/sdv.json") as {
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
    const { date, isVisible, range, selectedItem } = this.props;

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
          .map(equipmentId => (
            <EquipmentMenuItem
              equipmentId={equipmentId}
              date={date}
              key={equipmentId}
              selectEquipment={this.selectEquipment}
              selectedItem={selectedItem}
            />
          ))}
      </div>
    ) : null;
  }

  private selectEquipment = (equipmentId: string, skinIndex: number) => {
    this.setState({
      currentSkins: {
        ...this.state.currentSkins,
        [equipmentId]: skinIndex
      }
    });

    this.props.selectEquipment(equipmentId, skinIndex);
  };
}

export default EquipmentMenu;
