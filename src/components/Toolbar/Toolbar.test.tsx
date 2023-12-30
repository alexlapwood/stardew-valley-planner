import { fireEvent, render, screen } from "@solidjs/testing-library";

import Toolbar from "./Toolbar";

it("renders the app without crashing", () => {
  const { container } = render(() => (
    <Toolbar images={[]} selectTool={vitest.fn()} />
  ));
  expect(container).toMatchSnapshot();
});

it("calls selectTool when a tool is clicked", () => {
  const mockSelectTool = vitest.fn();
  render(() => <Toolbar images={[]} selectTool={mockSelectTool} />);

  fireEvent.click(screen.getByTestId("tool--pick-axe"));

  expect(mockSelectTool).toHaveBeenCalledWith("pick-axe");
});
