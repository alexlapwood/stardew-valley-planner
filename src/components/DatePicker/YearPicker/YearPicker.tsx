import * as React from "react";

import BigText from "../../BigText/BigText";

interface IProps {
  addYear: () => void;
  subtractYear: () => void;
  year: number;
}

const YearPicker: React.SFC<IProps> = props => (
  <div className="flex-horizontal flex">
    <div className="flex" />
    <div className="sdv-panel-big">
      <div className="DatePicker--year flex-horizontal">
        <button
          className="sdv-button-subtract"
          data-automation-id="DatePicker--year-subtract"
          disabled={props.year === 0}
          onClick={props.subtractYear}
        />
        <BigText>Year {String(props.year + 1)}</BigText>
        <button
          className="sdv-button-add"
          data-automation-id="DatePicker--year-add"
          onClick={props.addYear}
        />
      </div>
    </div>
    <div className="flex" />
  </div>
);

export default YearPicker;
