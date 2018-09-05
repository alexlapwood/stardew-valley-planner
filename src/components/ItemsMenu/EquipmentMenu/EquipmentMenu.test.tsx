import { mount } from "enzyme";
import * as React from "react";

import EquipmentMenu from "./EquipmentMenu";

it("updates the selected plant when a plant is clicked", () => {
  const selectEquipmentMock = jest.fn();

  const itemsMenu = mount(
    <EquipmentMenu selectEquipment={selectEquipmentMock} />
  );

  itemsMenu
    .find(".sdv-list-item")
    .first()
    .simulate("click");

  expect(selectEquipmentMock).toHaveBeenCalledWith("scarecrow");
});
