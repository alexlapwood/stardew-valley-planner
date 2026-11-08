import { trees } from "../data/game/trees.json";
import { getSaplingCost, getTreeIncome } from "./treeIncome";

const spring = 0;
const summer = 28;
const fall = 56;
const winter = 84;
const year = 112;

describe("Tree income helper", () => {
  describe("getSaplingCost", () => {
    it("uses the gold price of the sapling", () => {
      expect(getSaplingCost(trees.apple)).toEqual({
        cost: 4000,
        label: "4000g",
      });
    });

    it("shows the trade when no shop sells the sapling for gold", () => {
      expect(getSaplingCost(trees.banana)).toEqual({
        cost: 0,
        itemId: "(O)852",
        label: "Dragon Tooth ×5",
      });
    });

    it("has no cost when the sapling is only a random offer", () => {
      expect(getSaplingCost(trees.tea_bush)).toBeUndefined();
    });
  });

  describe("getTreeIncome", () => {
    it.each([
      ["apple", spring, { perDay: 33.33, total: 2800 }],
      ["apple", summer, { perDay: 50, total: 2800 }],
      ["apple", summer + 1, { perDay: 49.09, total: 2700 }],
      ["apple", fall, { perDay: 0, total: 0 }],
      ["apple", winter, { perDay: 0, total: 0 }],
      ["apple", year, { perDay: 33.33, total: 2800 }],
      ["apricot", spring, { perDay: 0, total: 0 }],
      ["tea_bush", spring, { perDay: 12.5, total: 1050 }],
      ["tea_bush", spring + 2, { perDay: 12.2, total: 1000 }],
      ["tea_bush", summer, { perDay: 12.5, total: 700 }],
      ["tea_bush", winter, { perDay: 0, total: 0 }],
    ])("%s planted on day %i", (treeId, date, expected) => {
      expect(getTreeIncome(trees[treeId], date)).toEqual(expected);
    });

    it("gives 1 fruit on the day the fruit tree is mature", () => {
      const tree = { ...trees.apple, seasons: ["summer"] };

      expect(getTreeIncome(tree, summer - tree.daysToMature + 27).total).toBe(
        100,
      );
    });

    it("gives tea leaves only on days 22 to 28 of a season", () => {
      const tree = { ...trees.tea_bush, daysToMature: 0, seasons: ["spring"] };

      expect(getTreeIncome(tree, spring).total).toBe(7 * tree.sell);
    });
  });
});
