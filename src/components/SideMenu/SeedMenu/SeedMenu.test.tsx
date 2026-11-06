import { fireEvent, render, screen } from "@solidjs/testing-library";

import { getCropIdsInSeason } from "../sideMenuItems";
import SeedMenu from "./SeedMenu";

const cropIds = getCropIdsInSeason(0);

describe("<SeedMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <SeedMenu cropIds={cropIds} date={0} selectCrop={vitest.fn()} />
    ));

    expect(container).toMatchSnapshot();
  });

  it("updates the selected plant when a plant is clicked", () => {
    const selectCropMock = vitest.fn();

    render(() => (
      <SeedMenu cropIds={cropIds} date={0} selectCrop={selectCropMock} />
    ));

    fireEvent.click(screen.getByTestId("seed--green_bean"));

    expect(selectCropMock).toHaveBeenCalledWith("green_bean");
  });

  describe("Crops that don't regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={0} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for year 2", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={28 * 4} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={23} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={24} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen.getByTestId("seed--parsnip").getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });
  });

  describe("Crops that don regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={0} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={23} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");
      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={24} selectCrop={vitest.fn()} />
      ));

      const tooltip = screen
        .getByTestId("seed--green_bean")
        .getAttribute("title");

      expect(tooltip).toMatchSnapshot();
    });
  });
});
