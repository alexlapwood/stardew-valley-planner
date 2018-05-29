import * as React from "react";

// import "./Sprite.css";

interface IProps {
  height: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

const Sprite: React.SFC<IProps> = props => {
  const { height, src, width, x, y } = props;

  return (
    <div
      className="sprite"
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${x}px -${y}px`,
        height: `${height}px`,
        width: `${width}px`
      }}
    />
  );
};

export default Sprite;
