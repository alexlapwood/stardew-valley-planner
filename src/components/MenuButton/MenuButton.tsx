import * as React from "react";

interface IProps {
  text: string;
}

const MenuButton: React.SFC<IProps> = props => (
  <div className="sdv-button">
    <div className="MenuButton" style={{ margin: "-5px 0px" }}>
      {props.text}
    </div>
  </div>
);

export default MenuButton;
