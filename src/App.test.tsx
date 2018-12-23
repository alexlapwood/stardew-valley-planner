import { mount, shallow } from "enzyme";
import * as React from "react";

import App from "./App";

import mockImages from "./__helpers__/images";

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

describe("Toolbars", () => {
  it("is visible by default", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    expect((wrapper.instance() as App).state.toolbarsDisabled).toBeFalsy();
  });

  it("is hidden when interacting with the farm", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("canvas").simulate("mouseDown");

    expect((wrapper.instance() as App).state.toolbarsDisabled).toBeTruthy();
  });

  it("is becomes visible on mouseUp", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("canvas").simulate("mouseDown");
    wrapper.find("canvas").simulate("mouseUp");

    expect((wrapper.instance() as App).state.toolbarsDisabled).toBeFalsy();
  });

  it("is becomes visible on mouseOut", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("canvas").simulate("mouseDown");
    wrapper.find("canvas").simulate("mouseOut");

    expect((wrapper.instance() as App).state.toolbarsDisabled).toBeFalsy();
  });
});

describe("Components", () => {
  it("sets the selectedItem to be of type tool when a tool is selected", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("[data-automationid='tool--pick-axe']").simulate("click");

    const actual = (wrapper.instance() as App).state.selectedItem;

    expect(actual && actual.type).toBe("tool");
  });

  it("sets the selectedItem to be of type crop when a crop is selected", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("[data-automationid='seeds-tab']").simulate("click");

    wrapper.find("[data-automationid='seed--ancient_fruit']").simulate("click");

    const actual = (wrapper.instance() as App).state.selectedItem;

    expect(actual && actual.type).toBe("crop");
  });

  it("sets the selectedItem to be of type equipment when equipment is selected", () => {
    const wrapper = mount(<App />);

    (wrapper.instance() as App).setState({
      images: mockImages,
      isLoading: false
    });
    wrapper.update();

    wrapper.find("[data-automationid='equipment-tab']").simulate("click");

    wrapper
      .find("[data-automationid='equipment-scarecrow--0']")
      .first()
      .simulate("click");

    const actual = (wrapper.instance() as App).state.selectedItem;

    expect(actual && actual.type).toBe("equipment");
  });
});
