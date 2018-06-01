import * as React from "react";

import BigText from "../../BigText/BigText";

interface IProps {
  changeDay: (day: number) => void;
  day: number;
}

const DayPicker: React.SFC<IProps> = props => (
  <div className="sdv-panel-big flex">
    <div className="DatePicker--day flex-horizontal">
      <div className="DatePicker--day-slider flex-horizontal flex">
        <input
          max="27"
          min="0"
          // tslint:disable-next-line:jsx-no-lambda
          onChange={e => props.changeDay(Number(e.target.value))}
          // tslint:disable-next-line:jsx-no-lambda
          onKeyDown={e => {
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
          value={props.day}
          type="range"
        />
      </div>
      <div className="DatePicker--day-text" style={{ display: "block" }}>
        <BigText>Day {props.day + 1}</BigText>
      </div>
    </div>
  </div>
);

export default DayPicker;
