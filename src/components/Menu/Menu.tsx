import * as React from "react";

import MenuButton from "../MenuButton/MenuButton";

import "./Menu.css";

interface IProps {
  menuItems: string[];
}

const Menu: React.SFC<IProps> = props => (
  <div className="Menu">
    <div className="flex-horizontal">
      {props.menuItems.map((menuItem, i) => (
        <MenuButton key={i}>{menuItem}</MenuButton>
      ))}
    </div>
  </div>
);

export default Menu;
