import { mount } from "enzyme";
import * as React from "react";

import ItemsMenu from "./ItemsMenu";

it("updates the selected plant when a plant is clicked", () => {
  const selectCropMock = jest.fn();

  const itemsMenu = mount(<ItemsMenu date={0} selectCrop={selectCropMock} />);

  itemsMenu
    .find(".sdv-list-item")
    .first()
    .simulate("click");

  expect(selectCropMock).toHaveBeenCalledWith("ancient_fruit");
});
