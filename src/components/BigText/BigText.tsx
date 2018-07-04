import * as React from "react";

import Sprite from "../Sprite/Sprite";

import "./BigText.css";

const BigText: React.SFC = props => {
  let text: string = "";

  if (props.children) {
    if (Array.isArray(props.children)) {
      text = props.children.join("");
    } else {
      text = String(props.children);
    }
  }

  return (
    <div className="BigText">
      {text.split("").map((character, i) => {
        const characterIndex = character.charCodeAt(0) - 32;
        return (
          <Sprite
            height={16}
            key={i}
            src="images/sdv-font.png"
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
