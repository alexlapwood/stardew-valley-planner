import { render } from "enzyme";
import * as React from "react";

import Toolbar from "./Toolbar";

it("renders the app without crashing", () => {
  const wrapper = render(<Toolbar />);
  expect(wrapper).toMatchSnapshot();
});
