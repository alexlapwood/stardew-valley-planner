import { mount } from "enzyme";
import * as React from "react";

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
        skinIndex={0}
      />
    );

    expect(menuItem).toMatchSnapshot();
  });

  describe("equipment with multiple skins", () => {
    it("moves to the next skin when clicking the right button", () => {
      const selectEquipment = jest.fn();
      const menuItem = mount<MenuItem>(
        <MenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
          skinIndex={0}
        />
      );

      menuItem
        .find("[data-automationid='equipment-button--right']")
        .first()
        .simulate("click");

      expect(selectEquipment).toBeCalledWith("scarecrow", 1);
    });

    it("moves to the previous skin when clicking the left button", () => {
      const selectEquipment = jest.fn();

      const menuItem = mount<MenuItem>(
        <MenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
          skinIndex={0}
        />
      );

      menuItem
        .find("[data-automationid='equipment-button--right']")
        .first()
        .simulate("click");

      expect(selectEquipment).toBeCalledWith("scarecrow", 1);

      menuItem
        .find("[data-automationid='equipment-button--left']")
        .first()
        .simulate("click");

      expect(selectEquipment).toBeCalledWith("scarecrow", 0);
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const selectEquipment = jest.fn();
    const menuItem = mount<MenuItem>(
      <MenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
        skinIndex={0}
      />
    );

    menuItem.simulate("click");

    expect(selectEquipment).toBeCalledWith("scarecrow", 0);
  });
});
