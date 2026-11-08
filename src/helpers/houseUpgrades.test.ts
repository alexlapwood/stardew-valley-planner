import { buildings } from "../data/game/buildings.json";
import {
  chainHouseUpgrades,
  eraseHouseUpgradeOn,
  findBadHouseUpgrade,
  findHouseLevel,
  getHouseLevelOn,
  getHouseLookOn,
  houseLevels,
  orderHouseUpgrade,
} from "./houseUpgrades";

const spring = 0;

const kitchen = { datePlaced: spring + 2, level: 1 };
const nursery = { datePlaced: spring + 5, level: 2 };
const cellar = { datePlaced: spring + 9, level: 3 };

describe("houseLevels", () => {
  it("has the levels of the export in order, with the names of the game's levels", () => {
    expect(houseLevels.map(({ level, name }) => [level, name])).toEqual([
      [1, "Kitchen"],
      [2, "Nursery"],
      [3, "Cellar"],
    ]);
  });

  it("reads the cost, materials and days of each level from the export", () => {
    const { houseUpgrades } = buildings.farmhouse;

    expect(houseLevels.map(({ level: _level, ...upgrade }) => upgrade)).toEqual(
      [houseUpgrades?.[1], houseUpgrades?.[2], houseUpgrades?.[3]],
    );
    expect(findHouseLevel(1)).toMatchObject({
      buildCost: 10_000,
      buildDays: 3,
      buildMaterials: [{ count: 450, itemId: "(O)388", name: "Wood" }],
    });
  });
});

describe("getHouseLevelOn and getHouseLookOn", () => {
  const upgrades = [kitchen, nursery, cellar];

  it("gives the new level from the date of the upgrade, with no build days", () => {
    expect(
      [1, 2, 4, 5, 8, 9, 50].map((date) => getHouseLevelOn(upgrades, date)),
    ).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("gives the start look before the first upgrade, and then the look of each level from the export", () => {
    const { houseUpgrades, startLook } = buildings.farmhouse;

    expect([1, 2, 5, 9].map((date) => getHouseLookOn(upgrades, date))).toEqual([
      startLook,
      houseUpgrades?.[1]?.look,
      houseUpgrades?.[2]?.look,
      houseUpgrades?.[3]?.look,
    ]);
  });
});

describe("orderHouseUpgrade", () => {
  it("upgrades to the next level on the date", () => {
    expect(orderHouseUpgrade([], 1, spring + 2)).toEqual({
      upgraded: [kitchen],
    });
  });

  it("upgrades to each level up to the selected one, all on the date", () => {
    expect(orderHouseUpgrade([], 3, spring + 2)).toEqual({
      upgraded: [
        kitchen,
        { datePlaced: spring + 2, level: 2 },
        { datePlaced: spring + 2, level: 3 },
      ],
    });
  });

  it("upgrades on any day, also on a Tuesday or a festival day", () => {
    expect(orderHouseUpgrade([], 1, spring + 1).upgraded).toEqual([
      { datePlaced: spring + 1, level: 1 },
    ]);
    expect(orderHouseUpgrade([], 1, spring + 12).upgraded).toEqual([
      { datePlaced: spring + 12, level: 1 },
    ]);
  });

  it("takes the place of the levels that were planned after the date", () => {
    const later = [{ datePlaced: spring + 20, level: 1 }];

    expect(orderHouseUpgrade(later, 1, spring + 2)).toEqual({
      upgraded: [kitchen],
    });
  });

  it("keeps the levels on the date and before it", () => {
    expect(orderHouseUpgrade([kitchen], 3, spring + 2)).toEqual({
      upgraded: [
        kitchen,
        { datePlaced: spring + 2, level: 2 },
        { datePlaced: spring + 2, level: 3 },
      ],
    });
    expect(orderHouseUpgrade([kitchen], 2, spring + 5)).toEqual({
      upgraded: [kitchen, nursery],
    });
  });

  it("refuses a level that the house has on the date", () => {
    expect(orderHouseUpgrade([kitchen, nursery], 2, spring + 5)).toEqual({
      refusal: "built",
    });
    expect(orderHouseUpgrade([kitchen, nursery], 1, spring + 9)).toEqual({
      refusal: "built",
    });
  });
});

describe("chainHouseUpgrades", () => {
  it("adds nothing when the house has the level", () => {
    expect(chainHouseUpgrades(2, 2, spring)).toEqual([]);
  });
});

describe("findBadHouseUpgrade", () => {
  it("finds no bad upgrade in a good chain, also with levels on the same date", () => {
    expect(findBadHouseUpgrade([kitchen, nursery, cellar])).toBe(-1);
    expect(
      findBadHouseUpgrade([kitchen, { ...nursery, datePlaced: spring + 2 }]),
    ).toBe(-1);
  });

  it.each([
    ["a skipped level", [nursery]],
    [
      "a level before the level below it",
      [kitchen, { ...nursery, datePlaced: spring + 1 }],
    ],
    [
      "a level that the game does not have",
      [kitchen, nursery, cellar, { datePlaced: 20, level: 4 }],
    ],
  ])("finds %s", (_, upgrades) => {
    expect(findBadHouseUpgrade(upgrades)).toBe(upgrades.length - 1);
  });
});

describe("eraseHouseUpgradeOn", () => {
  const upgrades = [kitchen, nursery];

  it("takes back the upgrade on its date, and keeps the levels before it", () => {
    expect(eraseHouseUpgradeOn(upgrades, spring + 5)).toEqual([kitchen]);
    expect(eraseHouseUpgradeOn(upgrades, spring + 2)).toEqual([]);
  });

  it("takes back each level of a chain on the same date", () => {
    const chain = orderHouseUpgrade([], 3, spring + 4).upgraded ?? [];

    expect(eraseHouseUpgradeOn(chain, spring + 4)).toEqual([]);
  });

  it("keeps the house as it is on a day with no upgrade, because the game cannot take a level back", () => {
    expect(eraseHouseUpgradeOn(upgrades, spring + 3)).toBe(upgrades);
    expect(eraseHouseUpgradeOn(upgrades, spring + 8)).toBe(upgrades);
    expect(eraseHouseUpgradeOn(upgrades, spring)).toBe(upgrades);
  });
});
