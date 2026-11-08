import { crops } from "../data/game/crops.json";
import { getCropIncome, getCropProfit } from "./cropIncome";

const spring = 0;
const summer = 28;
const year = 112;

describe("Crop income helper", () => {
  describe("examples", () => {
    it.each([
      [
        "parsnip",
        spring,
        { perDay: 7.5, total: 210 },
        { perDay: 3.21, total: 90 },
      ],
      [
        "strawberry",
        spring,
        { perDay: 21.43, total: 600 },
        { perDay: 17.86, total: 500 },
      ],
      [
        "blueberry",
        summer,
        { perDay: 21.43, total: 600 },
        { perDay: 18.57, total: 520 },
      ],
      [
        "parsnip",
        year,
        { perDay: 7.5, total: 210 },
        { perDay: 3.21, total: 90 },
      ],
    ])("%s planted on day %i", (cropId, date, income, profit) => {
      expect(getCropIncome(crops[cropId], date)).toEqual(income);
      expect(getCropProfit(crops[cropId], date)).toEqual(profit);
    });
  });

  describe("getCropIncome", () => {
    it("does not take off the seed cost", () => {
      const costlyParsnip = {
        ...crops.parsnip,
        seedPrices: { SeedShop: { price: 1000 } },
      };

      expect(getCropIncome(costlyParsnip, spring)).toEqual(
        getCropIncome(crops.parsnip, spring),
      );
    });

    it("has 0 harvests when the crop cannot ripen before its season ends", () => {
      expect(getCropIncome(crops.green_bean, 23)).toEqual({
        perDay: 0,
        total: 0,
      });
    });
  });

  describe("getCropProfit", () => {
    it("pays for 1 seed for a crop that regrows", () => {
      expect(getCropProfit(crops.green_bean, spring)).toEqual({
        perDay: 6.43,
        total: 180,
      });
    });

    it("pays for the seed of a crop that regrows, also with 0 harvests", () => {
      expect(getCropProfit(crops.green_bean, 23)).toEqual({
        perDay: -12,
        total: -60,
      });
    });

    it.each([
      ["no shop sells the seed", {}],
      [
        "the seed is only a trade",
        {
          Raccoon: {
            price: 0,
            trade: { count: 5, item: "Moss", itemId: "(O)Moss" },
          },
        },
      ],
      ["the seed is only a random offer", { Traveler: { random: true } }],
    ])("has no profit when %s", (_, seedPrices) => {
      expect(
        getCropProfit({ ...crops.parsnip, seedPrices }, spring),
      ).toBeUndefined();
    });
  });
});
