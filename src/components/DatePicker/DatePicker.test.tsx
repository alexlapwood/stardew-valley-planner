import { fireEvent, render, screen } from "@solidjs/testing-library";

import DatePicker from "./DatePicker";

describe("changing the date", () => {
  describe("changing the day", () => {
    it("can change the day", () => {
      const changeDate = vitest.fn();
      render(() => <DatePicker changeDate={changeDate} date={0} />);

      fireEvent.input(screen.getByTestId("DatePicker--day-slider-input"), {
        target: { value: "10" },
      });

      expect(changeDate).toHaveBeenCalledWith(10);
    });

    describe("changing to the previous season with the keyboard", () => {
      const keys = ["ArrowDown", "ArrowLeft"];

      keys.forEach((key) => {
        it(key, () => {
          const changeDate = vitest.fn();
          render(() => <DatePicker changeDate={changeDate} date={28} />);

          fireEvent.keyDown(
            screen.getByTestId("DatePicker--day-slider-input"),
            { key }
          );

          expect(changeDate).toHaveBeenCalledWith(27);
        });
      });
    });

    describe("changing to the next season with the keyboard", () => {
      const keys = ["ArrowRight", "ArrowUp"];

      keys.forEach((key) => {
        it(key, () => {
          const changeDate = vitest.fn();
          render(() => <DatePicker changeDate={changeDate} date={27} />);

          fireEvent.keyDown(
            screen.getByTestId("DatePicker--day-slider-input"),
            { key }
          );

          expect(changeDate).toHaveBeenCalledWith(28);
        });
      });
    });

    describe("does not change seasons with the keyboard during the middle of the month", () => {
      const keys = ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"];

      keys.forEach((key) => {
        it(key, () => {
          const changeDate = vitest.fn();
          render(() => <DatePicker changeDate={changeDate} date={10} />);

          fireEvent.keyDown(
            screen.getByTestId("DatePicker--day-slider-input"),
            { key }
          );

          expect(changeDate).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("changing the season", () => {
    const theories = [
      { date: 28 * 0, season: "spring" },
      { date: 28 * 1, season: "summer" },
      { date: 28 * 2, season: "fall" },
      { date: 28 * 3, season: "winter" },
    ];

    theories.forEach((theory) => {
      it(`can change the season to ${theory.season}`, () => {
        const changeDate = vitest.fn();
        render(() => <DatePicker changeDate={changeDate} date={0} />);

        fireEvent.click(
          screen.getByTestId(`DatePicker--season-${theory.season}`)
        );

        expect(changeDate).toHaveBeenCalledWith(theory.date);
      });
    });
  });

  describe("changing the year", () => {
    it(`can decrease the year by 1`, () => {
      const changeDate = vitest.fn();
      render(() => <DatePicker changeDate={changeDate} date={28 * 4 * 2} />);

      fireEvent.click(screen.getByTestId("DatePicker--year-subtract"));

      expect(changeDate).toHaveBeenCalledWith(28 * 4);
    });

    it(`can increase the year by 1`, () => {
      const changeDate = vitest.fn();
      render(() => <DatePicker changeDate={changeDate} date={0} />);

      fireEvent.click(screen.getByTestId("DatePicker--year-add"));

      expect(changeDate).toHaveBeenCalledWith(28 * 4);
    });
  });
});
