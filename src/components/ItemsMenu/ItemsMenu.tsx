import * as React from "react";

import EquipmentMenu from "./EquipmentMenu/EquipmentMenu";
import SeedMenu from "./SeedMenu/SeedMenu";

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectEquipment: (equipmentId: string) => void;
  selectedItem?: ISelectedItem;
}

const ItemsMenu: React.SFC<IProps> = props => (
  <React.Fragment>
    <EquipmentMenu
      selectEquipment={props.selectEquipment}
      selectedItem={props.selectedItem}
    />
    <SeedMenu
      date={props.date}
      selectCrop={props.selectCrop}
      selectedItem={props.selectedItem}
    />
  </React.Fragment>
);

export default ItemsMenu;
