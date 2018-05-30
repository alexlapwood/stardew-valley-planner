import * as React from "react";

import BigText from "../BigText/BigText";

import "./BigButton.css";

interface IProps {
  text: string;
}

const BigButton: React.SFC<IProps> = props => (
  <div className="sdv-button">
    <div className="BigButton">
      <BigText text={props.text} />
    </div>
  </div>
);

export default BigButton;
