import "./DatePicker.css";

import cn from "clsx";

import { getDay, getSeason, getYear } from "../../helpers/date";
import DayPicker from "./DayPicker/DayPicker";
import SeasonPicker from "./SeasonPicker/SeasonPicker";
import YearPicker from "./YearPicker/YearPicker";

interface IProps {
  changeDate: (day: number) => void;
  date: number;
  isDisabled?: boolean;
}

export default function DatePicker(props: IProps) {
  const daysInASeason = 28;
  const daysInAYear = daysInASeason * 4;

  const changeDay = (day: number) => {
    const newDate = Math.max(
      0,
      getYear(props.date) * daysInAYear +
        getSeason(props.date) * daysInASeason +
        day
    );
    props.changeDate(newDate);
  };

  const changeSeason = (season: number) => {
    props.changeDate(
      getYear(props.date) * daysInAYear + season * daysInASeason
    );
  };

  const addYear = () => {
    const newYear = getYear(props.date) + 1;
    props.changeDate(newYear * daysInAYear);
  };

  const subtractYear = () => {
    const newYear = getYear(props.date) - 1;
    props.changeDate(newYear * daysInAYear);
  };

  return (
    <div class={cn("DatePicker", { disabled: props.isDisabled })}>
      <div class="flex-horizontal">
        <DayPicker changeDay={changeDay} day={getDay(props.date)} />
        <SeasonPicker
          changeSeason={changeSeason}
          season={getSeason(props.date)}
        />
        <YearPicker
          addYear={addYear}
          subtractYear={subtractYear}
          year={getYear(props.date)}
        />
      </div>
    </div>
  );
}
