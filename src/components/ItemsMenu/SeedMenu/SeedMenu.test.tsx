import { mount } from "enzyme";
import * as React from "react";

import SeedMenu from "./SeedMenu";

it("updates the selected plant when a plant is clicked", () => {
  const selectCropMock = jest.fn();

  const itemsMenu = mount(
    <SeedMenu date={0} isVisible={true} selectCrop={selectCropMock} />
  );

  itemsMenu
    .find(".sdv-list-item")
    .first()
    .simulate("click");

  expect(selectCropMock).toHaveBeenCalledWith("ancient_fruit");
});
