import { atlasSprite } from "./atlas";
import {
  getGoldPrice,
  getIncomeTooltip,
  getPerDay,
  getPlanYearEnd,
  getShopCost,
  type IShopCost,
} from "./income";
import { getTooltipText } from "./tooltip";

const spring = 0;
const summer = 28;
const fall = 56;
const winter = 84;
const year = 112;

const costLine = (cost: IShopCost) =>
  getIncomeTooltip({ cost, income: { perDay: 0, total: 0 }, sell: 0 })[0];

describe("Income helper", () => {
  describe("getGoldPrice", () => {
    it("uses the first gold price in shop order", () => {
      expect(
        getGoldPrice({ Joja: { price: 25 }, SeedShop: { price: 20 } }),
      ).toBe(20);
    });

    it("skips a random price and a trade", () => {
      expect(
        getGoldPrice({
          Raccoon: {
            price: 0,
            trade: { count: 5, item: "Moss", itemId: "(O)Moss" },
          },
          Traveler: { random: true },
        }),
      ).toBeUndefined();
    });

    it("uses a fixed Traveler price", () => {
      expect(getGoldPrice({ Traveler: { price: 2500 } })).toBe(2500);
    });
  });

  describe("getShopCost", () => {
    it("shows the gold price", () => {
      expect(getShopCost({ SeedShop: { price: 4000 } })).toEqual({
        cost: 4000,
        label: "4000g",
      });
    });

    it("shows a trade and costs nothing when no shop sells it for gold", () => {
      expect(
        getShopCost({
          IslandTrade: {
            price: 0,
            trade: { count: 5, item: "Dragon Tooth", itemId: "(O)852" },
          },
        }),
      ).toEqual({ cost: 0, itemId: "(O)852", label: "Dragon Tooth ×5" });
    });

    it("has no cost when it is only a random offer", () => {
      expect(getShopCost({ Traveler: { random: true } })).toBeUndefined();
    });
  });

  describe("getPlanYearEnd", () => {
    it.each([
      [["spring"], spring, summer],
      [["spring", "summer"], spring, fall],
      [["summer", "fall"], summer + 5, winter],
      [["fall"], winter + 10, winter],
      [["spring", "summer", "fall", "winter"], summer, year],
      [["spring"], year + 3, year + summer],
    ])("ends %j planted on day %i on day %i", (seasons, date, expected) => {
      expect(getPlanYearEnd(seasons, date)).toBe(expected);
    });
  });

  describe("getPerDay", () => {
    it("rounds to 2 decimals", () => {
      expect(getPerDay(90, 0, 28)).toBe(3.21);
      expect(getPerDay(-30, 0, 28)).toBe(-1.07);
    });

    it("is 0 when no days are left", () => {
      expect(getPerDay(0, 84, 84)).toBe(0);
      expect(getPerDay(0, 90, 84)).toBe(0);
    });
  });

  describe("getIncomeTooltip", () => {
    it("shows all the lines in order", () => {
      expect(
        getTooltipText(
          getIncomeTooltip({
            cost: { cost: 20, label: "20g" },
            income: { perDay: 7.5, total: 210 },
            profit: { perDay: 3.21, total: 90 },
            sell: 35,
          }),
        ),
      ).toBe(
        "Cost: 20g\nSell: 35g\nIncome: 210g\nIncome/day: 7.5g\nProfit: 90g\nProfit/day: 3.21g",
      );
    });

    it("leaves out the cost and profit lines when there are none", () => {
      expect(
        getTooltipText(
          getIncomeTooltip({
            income: { perDay: 12.5, total: 1050 },
            sell: 50,
          }),
        ),
      ).toBe("Sell: 50g\nIncome: 1050g\nIncome/day: 12.5g");
    });

    it("draws the game icon of the item that a trade costs", () => {
      expect(
        costLine({ cost: 0, itemId: "(O)852", label: "Dragon Tooth ×5" }),
      ).toEqual({
        sprite: atlasSprite("materials", [304, 0, 16, 16]),
        text: "Cost: Dragon Tooth ×5",
      });
    });

    it("draws no icon for a gold cost, or for a trade item that has no game icon", () => {
      expect(costLine({ cost: 20, label: "20g" })).toEqual({
        text: "Cost: 20g",
      });
      expect(costLine({ cost: 0, itemId: "(O)0", label: "Weeds ×5" })).toEqual({
        text: "Cost: Weeds ×5",
      });
    });
  });
});
