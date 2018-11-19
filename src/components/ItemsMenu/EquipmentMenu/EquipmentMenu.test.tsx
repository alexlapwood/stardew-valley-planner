import { mount } from "enzyme";
import * as React from "react";

import EquipmentMenu from "./EquipmentMenu";

describe("<EquipmentMenu />", () => {
  describe("speciying a range", () => {
    it("renders the items up to and including range.to", () => {
      const itemsMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ to: 4 }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(itemsMenu).toMatchSnapshot();
    });

    it("only renders the items from range.from onwards", () => {
      const itemsMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ from: 4 }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(itemsMenu).toMatchSnapshot();
    });

    it("only renders the items in the range", () => {
      const itemsMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ from: 2, to: 4 }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(itemsMenu).toMatchSnapshot();
    });
  });

  describe("equipment with multiple skins", () => {
    it("moves to the next skin when clicking the right button", () => {
      const itemsMenu = mount<EquipmentMenu>(
        <EquipmentMenu date={0} isVisible={true} selectEquipment={jest.fn()} />
      );

      itemsMenu
        .find("[data-automationid='equipment--scarecrow']")
        .first()
        .find("[data-automationid='equipment-button--right']")
        .first()
        .simulate("click");

      expect(itemsMenu.state().currentSkins.scarecrow).toBe(1);
    });

    it("moves to the previous skin when clicking the left button", () => {
      const itemsMenu = mount<EquipmentMenu>(
        <EquipmentMenu date={0} isVisible={true} selectEquipment={jest.fn()} />
      );

      itemsMenu
        .find("[data-automationid='equipment--scarecrow']")
        .first()
        .find("[data-automationid='equipment-button--right']")
        .first()
        .simulate("click");

      itemsMenu
        .find("[data-automationid='equipment--scarecrow']")
        .first()
        .find("[data-automationid='equipment-button--left']")
        .first()
        .simulate("click");

      expect(itemsMenu.state().currentSkins.scarecrow).toBe(0);
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const selectEquipmentMock = jest.fn();

    const itemsMenu = mount(
      <EquipmentMenu
        date={0}
        isVisible={true}
        selectEquipment={selectEquipmentMock}
      />
    );

    itemsMenu
      .find("[data-automationid='equipment--scarecrow']")
      .first()
      .simulate("click");

    expect(selectEquipmentMock).toHaveBeenCalledWith("scarecrow", 0);
  });
});
