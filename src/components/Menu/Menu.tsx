import * as React from "react";

import "./Menu.css";

interface IProps {
  menuItems: string[];
}

const Menu: React.SFC<IProps> = props => (
  <div className="Menu">
    {props.menuItems.map(menuItem => (
      <div className="Menu--item sdv-button">{menuItem}</div>
    ))}
  </div>
);

export default Menu;
