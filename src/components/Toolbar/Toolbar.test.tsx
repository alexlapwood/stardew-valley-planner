import { mount, render } from "enzyme";
import React from "react";

import Toolbar from "./Toolbar";

it("renders the app without crashing", () => {
  const wrapper = render(<Toolbar images={[]} selectTool={jest.fn()} />);
  expect(wrapper).toMatchSnapshot();
});

it("calls selectTool when a tool is clicked", () => {
  const mockSelectTool = jest.fn();
  const wrapper = mount(<Toolbar images={[]} selectTool={mockSelectTool} />);

  wrapper
    .find("[data-automationid='tool--pick-axe']")
    .first()
    .simulate("click");

  expect(mockSelectTool).toHaveBeenCalledWith("pick-axe");
});
