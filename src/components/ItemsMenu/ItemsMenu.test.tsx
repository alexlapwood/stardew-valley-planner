import { shallow } from "enzyme";
import * as React from "react";

import ItemsMenu from "./ItemsMenu";

it("renders correctly", () => {
  const itemsMenu = shallow(<ItemsMenu date={0} selectCrop={jest.fn()} />);

  expect(itemsMenu).toMatchSnapshot();
});
