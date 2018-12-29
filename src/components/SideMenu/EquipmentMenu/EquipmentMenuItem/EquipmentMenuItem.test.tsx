import { mount } from "enzyme";
import React from "react";

import EquipmentMenuItem from "./EquipmentMenuItem";

// tslint:disable-next-line:no-var-requires
const { equipmentIds } = require("../../../../data/sdv.json") as {
  equipmentIds: string[];
};

describe("<EquipmentMenuItem />", () => {
  it("renders correctly", () => {
    const equipmentMenuItem = mount(
      <EquipmentMenuItem
        date={0}
        equipmentId={equipmentIds[0]}
        selectEquipment={jest.fn()}
      />
    );

    expect(equipmentMenuItem.find(".sdv-list-item")).toHaveLength(1);
    expect(equipmentMenuItem).toMatchSnapshot();
  });

  it("selects the item when clicked", () => {
    const selectEquipment = jest.fn();

    const equipmentMenuItem = mount<EquipmentMenuItem>(
      <EquipmentMenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    );

    equipmentMenuItem
      .find("[data-automationid='equipment-scarecrow--0']")
      .simulate("click");

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", 0);
  });

  describe("equipment with multiple skins", () => {
    it("shows extra skins when clicking the dropdown trigger", () => {
      const selectEquipment = jest.fn();
      const equipmentMenuItem = mount<EquipmentMenuItem>(
        <EquipmentMenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      );

      equipmentMenuItem
        .find("[data-automationid='equipment-dropdown--trigger']")
        .first()
        .simulate("click");

      expect(equipmentMenuItem.find(".sdv-list-item")).toHaveLength(10);
    });

    it("hides extra skins when clicking the dropdown trigger if the dropdown is already open", () => {
      const selectEquipment = jest.fn();
      const equipmentMenuItem = mount<EquipmentMenuItem>(
        <EquipmentMenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      );

      equipmentMenuItem.setState({ open: true });

      equipmentMenuItem
        .find("[data-automationid='equipment-dropdown--trigger']")
        .first()
        .simulate("click");

      expect(equipmentMenuItem.find(".sdv-list-item")).toHaveLength(1);
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const selectEquipment = jest.fn();
    const equipmentMenuItem = mount<EquipmentMenuItem>(
      <EquipmentMenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    );

    equipmentMenuItem.setState({ open: true });

    equipmentMenuItem
      .find("[data-automationid='equipment-scarecrow--1']")
      .simulate("click");

    expect(selectEquipment).toBeCalledWith("scarecrow", 1);
  });
});
