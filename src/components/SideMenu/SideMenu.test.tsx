import { shallow } from "enzyme";
import React from "react";

import SideMenu from "./SideMenu";

describe("<SideMenu />", () => {
  it("renders correctly", () => {
    const sideMenu = shallow(
      <SideMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    expect(sideMenu).toMatchSnapshot();
  });

  it("shows the seed menu", () => {
    const sideMenu = shallow(
      <SideMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    sideMenu.find("[data-automationid='seeds-tab']").simulate("click");

    const currentMenu = (sideMenu.instance() as SideMenu).state.currentMenu;

    expect(currentMenu).toBe("seeds");
  });

  it("shows the equipment menu", () => {
    const sideMenu = shallow(
      <SideMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    sideMenu.find("[data-automationid='equipment-tab']").simulate("click");

    const currentMenu = (sideMenu.instance() as SideMenu).state.currentMenu;

    expect(currentMenu).toBe("equipment");
  });

  it("shows the decorations menu", () => {
    const sideMenu = shallow(
      <SideMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
    );

    sideMenu.find("[data-automationid='decorations-tab']").simulate("click");

    const currentMenu = (sideMenu.instance() as SideMenu).state.currentMenu;

    expect(currentMenu).toBe("decorations");
  });
});
