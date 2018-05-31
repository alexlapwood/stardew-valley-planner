import * as React from "react";

const MenuButton: React.SFC = props => (
  <div className="MenuButton sdv-button-menu flex">{props.children}</div>
);

export default MenuButton;
