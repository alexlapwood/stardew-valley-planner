import { shallow } from "enzyme";
import React from "react";

import ItemsMenu from "./ItemsMenu";

it("renders correctly", () => {
  const itemsMenu = shallow(
    <ItemsMenu date={0} selectCrop={jest.fn()} selectEquipment={jest.fn()} />
  );

  expect(itemsMenu).toMatchSnapshot();
});
