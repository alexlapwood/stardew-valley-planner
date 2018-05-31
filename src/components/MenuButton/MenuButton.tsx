import * as React from "react";

const MenuButton: React.SFC = props => (
  <div className="sdv-button-big" style={{ flex: 1 }}>
    <div className="MenuButton" style={{ margin: "-5px 0px" }}>
      {props.children}
    </div>
  </div>
);

export default MenuButton;
