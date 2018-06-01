import * as React from "react";

import DayPicker from "./DayPicker/DayPicker";
import SeasonPicker from "./SeasonPicker/SeasonPicker";
import YearPicker from "./YearPicker/YearPicker";

import { getDay, getSeason, getYear } from "../../helpers/date";

import "./DatePicker.css";

interface IProps {
  changeDate: (day: number) => void;
  date: number;
}

const DatePicker: React.SFC<IProps> = props => {
  const { date, changeDate } = props;

  const daysInASeason = 28;
  const daysInAYear = daysInASeason * 4;

  const changeDay = (day: number) => {
    const newDate = Math.max(
      0,
      getYear(date) * daysInAYear + getSeason(date) * daysInASeason + day
    );
    changeDate(newDate);
  };

  const changeSeason = (season: number) => {
    changeDate(getYear(date) * daysInAYear + season * daysInASeason);
  };

  const addYear = () => {
    const newYear = getYear(date) + 1;
    changeDate(newYear * daysInAYear);
  };

  const subtractYear = () => {
    const newYear = getYear(date) - 1;
    changeDate(newYear * daysInAYear);
  };

  return (
    <div className="DatePicker">
      <div className="flex-horizontal">
        <DayPicker changeDay={changeDay} day={getDay(date)} />
        <SeasonPicker changeSeason={changeSeason} season={getSeason(date)} />
        <YearPicker
          addYear={addYear}
          subtractYear={subtractYear}
          year={getYear(date)}
        />
      </div>
    </div>
  );
};
export default DatePicker;
