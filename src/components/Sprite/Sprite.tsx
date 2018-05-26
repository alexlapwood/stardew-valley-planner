import * as React from "react";

import "./Sprite.css";

interface IProps {
  height: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

class Sprite extends React.Component<IProps> {
  public render() {
    const { height, src, width, x, y } = this.props;

    return (
      <div style={{ position: "relative" }}>
        <div
          className="sprite"
          style={{
            backgroundImage: `url(${src})`,
            backgroundPosition: `-${x}px -${y}px`,
            height: `${height}px`,
            width: `${width}px`
          }}
        />
      </div>
    );
  }
}

export default Sprite;
