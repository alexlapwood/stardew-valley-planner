import { mount } from "enzyme";
import React from "react";

import MenuItem from "./MenuItem";

// tslint:disable-next-line:no-var-requires
const { equipmentIds } = require("../../../data/sdv.json") as {
  equipmentIds: string[];
};

describe("<MenuItem />", () => {
  it("renders correctly", () => {
    const menuItem = mount(
      <MenuItem
        date={0}
        equipmentId={equipmentIds[0]}
        selectEquipment={jest.fn()}
      />
    );

    expect(menuItem.find(".sdv-list-item")).toHaveLength(1);
    expect(menuItem).toMatchSnapshot();
  });

  it("selects the item when clicked", () => {
    const selectEquipment = jest.fn();

    const menuItem = mount<MenuItem>(
      <MenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    );

    menuItem
      .find("[data-automationid='equipment-scarecrow--0']")
      .simulate("click");

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", 0);
  });

  describe("equipment with multiple skins", () => {
    it("shows extra skins when clicking the dropdown trigger", () => {
      const selectEquipment = jest.fn();
      const menuItem = mount<MenuItem>(
        <MenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      );

      menuItem
        .find("[data-automationid='equipment-dropdown--trigger']")
        .first()
        .simulate("click");

      expect(menuItem.find(".sdv-list-item")).toHaveLength(10);
    });

    it("hides extra skins when clicking the dropdown trigger if the dropdown is already open", () => {
      const selectEquipment = jest.fn();
      const menuItem = mount<MenuItem>(
        <MenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      );

      menuItem.setState({ open: true });

      menuItem
        .find("[data-automationid='equipment-dropdown--trigger']")
        .first()
        .simulate("click");

      expect(menuItem.find(".sdv-list-item")).toHaveLength(1);
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const selectEquipment = jest.fn();
    const menuItem = mount<MenuItem>(
      <MenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    );

    menuItem.setState({ open: true });

    menuItem
      .find("[data-automationid='equipment-scarecrow--1']")
      .simulate("click");

    expect(selectEquipment).toBeCalledWith("scarecrow", 1);
  });
});
