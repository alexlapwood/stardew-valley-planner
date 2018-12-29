import { mount } from "enzyme";
import React from "react";

import EquipmentMenu from "./EquipmentMenu";

// tslint:disable-next-line:no-var-requires
const { equipmentIds } = require("../../../data/sdv.json") as {
  equipmentIds: string[];
};

describe("<EquipmentMenu />", () => {
  it("renders correctly", () => {
    const equipmentMenu = mount(
      <EquipmentMenu
        date={0}
        isVisible={true}
        range={{ to: 2 }}
        selectEquipment={jest.fn()}
      />
    );

    expect(equipmentMenu).toMatchSnapshot();
  });

  describe("speciying a range", () => {
    it("renders the items up to and including range.to", () => {
      const to = 4;

      const equipmentMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ to }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(equipmentMenu.find("MenuItem")).toHaveLength(to + 1);
    });

    it("only renders the items from range.from onwards", () => {
      const from = 4;

      const equipmentMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ from }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(equipmentMenu.find("MenuItem")).toHaveLength(
        equipmentIds.length - 4
      );
    });

    it("only renders the items in the range", () => {
      const from = 2;
      const to = 4;
      const equipmentMenu = mount(
        <EquipmentMenu
          date={0}
          range={{ from, to }}
          isVisible={true}
          selectEquipment={jest.fn()}
        />
      );

      expect(equipmentMenu.find("MenuItem")).toHaveLength(to - from + 1);
    });
  });
});
