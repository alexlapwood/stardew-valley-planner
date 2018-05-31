import * as cn from "classnames";
import * as React from "react";

import BigText from "../BigText/BigText";

import "./BigButton.css";

interface IProps {
  selected?: boolean;
  onClick?: ((event: React.MouseEvent<HTMLDivElement>) => void) | undefined;
}

const BigButton: React.SFC<IProps> = props => (
  <div
    className={cn("sdv-button-big", "sdv-hover-effect", {
      selected: props.selected
    })}
    onClick={props.onClick}
  >
    <div className="BigButton">
      <BigText>{props.children}</BigText>
    </div>
  </div>
);

export default BigButton;
