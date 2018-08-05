import * as React from "react";

import SeedMenu from "./SeedMenu/SeedMenu";

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectedItem?: ISelectedItem;
}

const ItemsMenu: React.SFC<IProps> = props => (
  <SeedMenu
    date={props.date}
    selectCrop={props.selectCrop}
    selectedItem={props.selectedItem}
  />
);

export default ItemsMenu;
