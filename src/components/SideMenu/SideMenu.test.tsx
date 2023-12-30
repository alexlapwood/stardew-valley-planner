import { fireEvent, render, screen } from "@solidjs/testing-library";

import SideMenu from "./SideMenu";

describe("<SideMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <SideMenu
        date={0}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
      />
    ));

    expect(container).toMatchSnapshot();
  });

  it("shows the seed menu", () => {
    render(() => (
      <SideMenu
        date={0}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
      />
    ));

    fireEvent.click(screen.getByTestId("seeds-tab"));

    expect(screen.getByTestId("seeds-tab")).toHaveClass("selected");
  });

  it("shows the equipment menu", () => {
    render(() => (
      <SideMenu
        date={0}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
      />
    ));

    fireEvent.click(screen.getByTestId("equipment-tab"));

    expect(screen.getByTestId("equipment-tab")).toHaveClass("selected");
  });

  it("shows the decorations menu", () => {
    render(() => (
      <SideMenu
        date={0}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
      />
    ));

    fireEvent.click(screen.getByTestId("decorations-tab"));

    expect(screen.getByTestId("decorations-tab")).toHaveClass("selected");
  });
});
