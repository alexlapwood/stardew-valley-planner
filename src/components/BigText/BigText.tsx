import * as React from "react";

import Sprite from "../Sprite/Sprite";

import "./BigText.css";

interface IProps {
  text: string;
}

const BigText: React.SFC<IProps> = props => {
  return (
    <div className="BigText">
      {props.text.split("").map((character, i) => {
        const characterIndex = character.charCodeAt(0) - 33;
        return (
          <Sprite
            height={16}
            key={i}
            src="/images/sdv-font.png"
            width={8}
            x={characterIndex * 8}
            y={0}
          />
        );
      })}
    </div>
  );
};

export default BigText;
