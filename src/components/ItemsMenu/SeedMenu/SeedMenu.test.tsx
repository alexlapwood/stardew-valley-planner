import { mount, render } from "enzyme";
import React from "react";

import SeedMenu from "./SeedMenu";

describe("<SeedMenu />", () => {
  it("renders correctly", () => {
    const seedMenu = render(
      <SeedMenu date={0} isVisible={true} selectCrop={jest.fn()} />
    );

    expect(seedMenu).toMatchSnapshot();
  });

  it("updates the selected plant when a plant is clicked", () => {
    const selectCropMock = jest.fn();

    const seedMenu = mount(
      <SeedMenu date={0} isVisible={true} selectCrop={selectCropMock} />
    );

    seedMenu.find("[data-automationid='seed--green_bean']").simulate("click");

    expect(selectCropMock).toHaveBeenCalledWith("green_bean");
  });

  describe("Crops that don't regrow", () => {
    it("calculates the profit correctly", () => {
      const seedMenu = mount(
        <SeedMenu date={0} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--parsnip']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for year 2", () => {
      const seedMenu = mount(
        <SeedMenu date={28 * 4} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--parsnip']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      const seedMenu = mount(
        <SeedMenu date={23} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--parsnip']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      const seedMenu = mount(
        <SeedMenu date={24} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--parsnip']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });
  });

  describe("Crops that don regrow", () => {
    it("calculates the profit correctly", () => {
      const seedMenu = mount(
        <SeedMenu date={0} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--green_bean']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      const seedMenu = mount(
        <SeedMenu date={2} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--green_bean']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      const seedMenu = mount(
        <SeedMenu date={3} isVisible={true} selectCrop={jest.fn()} />
      );

      const tooltip = seedMenu
        .find("[data-automationid='seed--green_bean']")
        .prop("title");

      expect(tooltip).toMatchSnapshot();
    });
  });
});
