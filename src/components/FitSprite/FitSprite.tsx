import Sprite from "../Sprite/Sprite";

interface IProps {
  height: number;
  size: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

// A building is many times bigger than a menu icon, so it shrinks to fit the
// icon box, in the middle of the box.
export default function FitSprite(props: IProps) {
  const scale = () =>
    Math.min(1, props.size / Math.max(props.width, props.height));

  return (
    <div
      class="FitSprite"
      style={{
        height: `${props.size}px`,
        overflow: "hidden",
        position: "relative",
        width: `${props.size}px`,
      }}
    >
      <div
        style={{
          left: `${(props.size - props.width * scale()) / 2}px`,
          position: "absolute",
          top: `${(props.size - props.height * scale()) / 2}px`,
          transform: `scale(${scale()})`,
          "transform-origin": "top left",
        }}
      >
        <Sprite
          height={props.height}
          src={props.src}
          width={props.width}
          x={props.x}
          y={props.y}
        />
      </div>
    </div>
  );
}
