import React from "react";

import Sprite from "../Sprite/Sprite";

import "./BigText.css";

class BigText extends React.Component {
  private bigTextRef = React.createRef<HTMLDivElement>();

  private scale = 1;

  public componentDidMount() {
    this.forceUpdate();
  }

  public render() {
    const { children } = this.props;
    let text: string = "";

    if (children) {
      if (Array.isArray(children)) {
        text = children.join("");
      } else {
        text = String(children);
      }
    }

    if (this.bigTextRef.current !== null) {
      this.scale = Math.min(
        this.bigTextRef.current.offsetWidth / (text.length * 8),
        1
      );
    }

    return (
      <div className="BigText" ref={this.bigTextRef}>
        <div
          style={{
            transform: `scale(${this.scale})`,
            transformOrigin: "left center",
            whiteSpace: "nowrap"
          }}
        >
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
      </div>
    );
  }
}

export default BigText;
