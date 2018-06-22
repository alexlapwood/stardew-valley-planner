import { mount, shallow } from "enzyme";
import * as React from "react";

import App from "./App";

it("renders the app without crashing", async () => {
  const wrapper = mount(<App />);

  await (wrapper.instance() as App).componentDidMount();

  expect(wrapper.render()).toMatchSnapshot();
});

describe("state", () => {
  it("initialises correctly", () => {
    const wrapper = shallow(<App />);

    const actual = (wrapper.instance() as App).state.date;

    expect(actual).toBe(0);
  });

  describe("changeDate", () => {
    it("changes the date", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).changeDate(10);

      const actual = (wrapper.instance() as App).state.date;
      expect(actual).toBe(10);
    });

    it("deselects the current crop if it is out of season", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).setState({
        selectedItem: { id: "parsnip", type: "crop" }
      });
      (wrapper.instance() as App).changeDate(28 * 1);

      const actual = (wrapper.instance() as App).state.selectedItem;
      expect(actual).toBeUndefined();
    });

    it("does not deselect the current crop if it is in season", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).setState({
        selectedItem: { id: "ancient_fruit", type: "crop" }
      });
      (wrapper.instance() as App).changeDate(28 * 1);

      const actual = (wrapper.instance() as App).state.selectedItem;
      expect(actual).toEqual({ id: "ancient_fruit", type: "crop" });
    });

    it("does not deselect tools", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).setState({
        selectedItem: { id: "tool", type: "tool" }
      });
      (wrapper.instance() as App).changeDate(28 * 1);

      const actual = (wrapper.instance() as App).state.selectedItem;
      expect(actual).toEqual({ id: "tool", type: "tool" });
    });
  });
});
