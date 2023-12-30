import BigText from "../../BigText/BigText";

interface IProps {
  changeDay: (day: number) => void;
  day: number;
}

export default function DayPicker(props: IProps) {
  return (
    <div class="sdv-panel-big flex">
      <div class="DatePicker--day flex-horizontal">
        <div class="DatePicker--day-slider flex-horizontal flex">
          <input
            data-testid="DatePicker--day-slider-input"
            max="27"
            min="0"
            onInput={(e) => props.changeDay(Number(e.target.value))}
            onKeyDown={(e) => {
              switch (e.key) {
                case "ArrowLeft":
                case "ArrowDown":
                  if (props.day === 0) {
                    e.preventDefault();
                    props.changeDay(props.day - 1);
                  }
                  break;
                case "ArrowRight":
                case "ArrowUp":
                  if (props.day === 27) {
                    e.preventDefault();
                    props.changeDay(props.day + 1);
                  }
                  break;
              }
            }}
            type="range"
            value={props.day}
          />
        </div>
        <div class="DatePicker--day-text" style={{ display: "block" }}>
          <BigText>Day {props.day + 1}</BigText>
        </div>
      </div>
    </div>
  );
}
