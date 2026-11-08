import { fireEvent, render, screen } from "@solidjs/testing-library";

import { readTooltip } from "../../../__helpers__/tooltip";
import { getCropIdsInSeason } from "../sideMenuItems";
import SeedMenu from "./SeedMenu";

const cropIds = getCropIdsInSeason(0);

function tooltip(cropId: string, date: number) {
  render(() => (
    <SeedMenu cropIds={[cropId]} date={date} selectCrop={vitest.fn()} />
  ));

  return readTooltip(screen.getByTestId(`seed--${cropId}`));
}

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

  describe("tooltip", () => {
    it.each([
      [
        "parsnip",
        0,
        "Cost: 20g\nSell: 35g\nIncome: 210g\nIncome/day: 7.5g\nProfit: 90g\nProfit/day: 3.21g",
      ],
      [
        "strawberry",
        0,
        "Cost: 100g\nSell: 120g\nIncome: 600g\nIncome/day: 21.43g\nProfit: 500g\nProfit/day: 17.86g",
      ],
      [
        "blueberry",
        28,
        "Cost: 80g\nSell: 50g\nIncome: 600g\nIncome/day: 21.43g\nProfit: 520g\nProfit/day: 18.57g",
      ],
    ])(
      "shows cost, sell, income and profit for %s on day %i",
      (cropId, date, expected) => {
        expect(tooltip(cropId, date)).toBe(expected);
      },
    );

    it("shows no profit when the seed has no gold price", () => {
      expect(tooltip("ancient_fruit", 0)).toBe(
        "Sell: 550g\nIncome: 4400g\nIncome/day: 52.38g",
      );
    });

    it("shows no profit when the seed is only a trade", () => {
      expect(tooltip("carrot", 0)).not.toContain("Profit");
    });
  });

  describe("Crops that don't regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={0} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--parsnip"));

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for year 2", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={28 * 4} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--parsnip"));

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={23} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--parsnip"));

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={24} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--parsnip"));

      expect(tooltip).toMatchSnapshot();
    });
  });

  describe("Crops that don regrow", () => {
    it("calculates the profit correctly", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={0} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--green_bean"));

      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted just before they go out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={23} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--green_bean"));
      expect(tooltip).toMatchSnapshot();
    });

    it("calculates the profit correctly for crops planted out of season", () => {
      render(() => (
        <SeedMenu cropIds={cropIds} date={24} selectCrop={vitest.fn()} />
      ));

      const tooltip = readTooltip(screen.getByTestId("seed--green_bean"));

      expect(tooltip).toMatchSnapshot();
    });
  });
});
