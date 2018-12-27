import { shallow } from "enzyme";
import React from "react";

import ItemsMenu from "./ItemsMenu";

describe("<ItemsMenu />", () => {
  it("renders correctly", () => {
    const itemsMenu = shallow(
      <ItemsMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    expect(itemsMenu).toMatchSnapshot();
  });

  it("shows the seed menu", () => {
    const itemsMenu = shallow(
      <ItemsMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    itemsMenu.find("[data-automationid='seeds-tab']").simulate("click");

    const currentMenu = (itemsMenu.instance() as ItemsMenu).state.currentMenu;

    expect(currentMenu).toBe("seeds");
  });

  it("shows the equipment menu", () => {
    const itemsMenu = shallow(
      <ItemsMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    itemsMenu.find("[data-automationid='equipment-tab']").simulate("click");

    const currentMenu = (itemsMenu.instance() as ItemsMenu).state.currentMenu;

    expect(currentMenu).toBe("equipment");
  });

  it("shows the decorations menu", () => {
    const itemsMenu = shallow(
      <ItemsMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    itemsMenu.find("[data-automationid='decorations-tab']").simulate("click");

    const currentMenu = (itemsMenu.instance() as ItemsMenu).state.currentMenu;

    expect(currentMenu).toBe("decorations");
  });
});
