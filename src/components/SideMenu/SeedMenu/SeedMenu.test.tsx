import { fireEvent, render, screen } from "@solidjs/testing-library";

import SeedMenu from "./SeedMenu";

describe("<SeedMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <SeedMenu date={0} isVisible={true} selectCrop={vitest.fn()} />
    ));

    expect(container).toMatchSnapshot();
  });

  it("updates the selected plant when a plant is clicked", () => {
    const selectCropMock = vitest.fn();

    render(() => (
      <SeedMenu date={0} isVisible={true} selectCrop={selectCropMock} />
    ));

    fireEvent.click(screen.getByTestId("seed--green_bean"));

    expect(selectCropMock).toHaveBeenCalledWith("green_bean");
  });

  describe("Crops that don't regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu date={0} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for year 2", () => {
      render(() => (
        <SeedMenu date={28 * 4} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu date={23} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu date={24} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });
  });

  describe("Crops that don regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu date={0} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu date={23} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");
      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu date={24} isVisible={true} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });
  });
});
