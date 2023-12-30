interface IProps {
  height: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

export default function Sprite(props: IProps) {
  return (
    <div
      class="sprite"
      style={{
        "background-image": `url(${props.src})`,
        "background-position": `-${props.x}px -${props.y}px`,
        display: "inline-block",
        height: `${props.height}px`,
        "vertical-align": "top",
        width: `${props.width}px`,
      }}
    />
  );
}
