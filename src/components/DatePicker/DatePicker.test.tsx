import { mount } from "enzyme";
import React from "react";

import DatePicker from "./DatePicker";

describe("changing the date", () => {
  describe("changing the day", () => {
    it("can change the day", () => {
      const changeDate = jest.fn();
      const wrapper = mount(<DatePicker changeDate={changeDate} date={0} />);

      wrapper
        .find(`[data-automation-id="DatePicker--day-slider-input"]`)
        .simulate("change", { target: { value: "10" } });

      expect(changeDate).toHaveBeenCalledWith(10);
    });

    describe("changing to the previous season with the keyboard", () => {
      const keys = ["ArrowDown", "ArrowLeft"];

      keys.forEach(key => {
        it(key, () => {
          const changeDate = jest.fn();
          const wrapper = mount(
            <DatePicker changeDate={changeDate} date={28} />
          );

          wrapper
            .find(`[data-automation-id="DatePicker--day-slider-input"]`)
            .simulate("keyDown", { key });

          expect(changeDate).toHaveBeenCalledWith(27);
        });
      });
    });

    describe("changing to the next season with the keyboard", () => {
      const keys = ["ArrowRight", "ArrowUp"];

      keys.forEach(key => {
        it(key, () => {
          const changeDate = jest.fn();
          const wrapper = mount(
            <DatePicker changeDate={changeDate} date={27} />
          );

          wrapper
            .find(`[data-automation-id="DatePicker--day-slider-input"]`)
            .simulate("keyDown", { key });

          expect(changeDate).toHaveBeenCalledWith(28);
        });
      });
    });

    describe("does not change seasons with the keyboard during the middle of the month", () => {
      const keys = ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"];

      keys.forEach(key => {
        it(key, () => {
          const changeDate = jest.fn();
          const wrapper = mount(
            <DatePicker changeDate={changeDate} date={10} />
          );

          wrapper
            .find(`[data-automation-id="DatePicker--day-slider-input"]`)
            .simulate("keyDown", { key });

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
      { date: 28 * 3, season: "winter" }
    ];

    theories.forEach(theory => {
      it(`can change the season to ${theory.season}`, () => {
        const changeDate = jest.fn();
        const wrapper = mount(<DatePicker changeDate={changeDate} date={0} />);

        wrapper
          .find(`[data-automation-id="DatePicker--season-${theory.season}"]`)
          .simulate("click");

        expect(changeDate).toHaveBeenCalledWith(theory.date);
      });
    });
  });

  describe("changing the year", () => {
    it(`can decrease the year by 1`, () => {
      const changeDate = jest.fn();
      const wrapper = mount(
        <DatePicker changeDate={changeDate} date={28 * 4 * 2} />
      );

      wrapper
        .find(`[data-automation-id="DatePicker--year-subtract"]`)
        .simulate("click");

      expect(changeDate).toHaveBeenCalledWith(28 * 4);
    });

    it(`can increase the year by 1`, () => {
      const changeDate = jest.fn();
      const wrapper = mount(<DatePicker changeDate={changeDate} date={0} />);

      wrapper
        .find(`[data-automation-id="DatePicker--year-add"]`)
        .simulate("click");

      expect(changeDate).toHaveBeenCalledWith(28 * 4);
    });
  });
});
