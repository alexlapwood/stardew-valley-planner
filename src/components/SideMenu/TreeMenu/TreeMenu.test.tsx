import { fireEvent, render, screen } from "@solidjs/testing-library";

import { readTooltip } from "../../../__helpers__/tooltip";
import { trees } from "../../../data/game/trees.json";
import TreeMenu from "./TreeMenu";

const spring = 0;
const fall = 56;

function tooltip(treeId: string, date: number) {
  render(() => (
    <TreeMenu
      date={date}
      selectTree={vitest.fn()}
      treeIds={Object.keys(trees)}
    />
  ));

  return readTooltip(screen.getByTestId(`tree--${treeId}`));
}

describe("<TreeMenu />", () => {
  it("shows the cost, sell price and income of a fruit tree", () => {
    expect(tooltip("apple", spring)).toBe(
      "Cost: 4000g\nSell: 100g\nIncome: 2800g\nIncome/day: 33.33g",
    );
  });

  it("shows no income for a fruit tree that cannot be mature in its season", () => {
    expect(tooltip("apple", fall)).toBe(
      "Cost: 4000g\nSell: 100g\nIncome: 0g\nIncome/day: 0g",
    );
  });

  it("shows no cost when the sapling is only a random offer", () => {
    expect(tooltip("tea_bush", spring)).toBe(
      "Sell: 50g\nIncome: 1050g\nIncome/day: 12.5g",
    );
  });

  it("shows the trade as the cost", () => {
    expect(tooltip("banana", spring)).toBe(
      "Cost: Dragon Tooth ×5\nSell: 150g\nIncome: 4200g\nIncome/day: 75g",
    );
  });

  it("draws the game icon of the trade item on the cost line", () => {
    render(() => (
      <TreeMenu date={spring} selectTree={vitest.fn()} treeIds={["banana"]} />
    ));

    fireEvent.focusIn(screen.getByTestId("tree--banana"));

    const [costLine] = screen.getByRole("tooltip").children;
    const style =
      costLine.querySelector<HTMLElement>(".FitSprite .sprite")?.style;

    expect([style?.backgroundImage, style?.backgroundPosition]).toEqual([
      'url("images/game/materials.png")',
      "-304px 0px",
    ]);
  });

  it("never shows profit", () => {
    render(() => (
      <TreeMenu
        date={spring}
        selectTree={vitest.fn()}
        treeIds={Object.keys(trees)}
      />
    ));

    expect(
      Object.keys(trees).filter(
        (treeId) =>
          readTooltip(screen.getByTestId(`tree--${treeId}`))?.includes(
            "Profit",
          ) === true,
      ),
    ).toEqual([]);
  });
});
