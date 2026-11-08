import { describeNextGoodDate, describeRefusal } from "./buildingReasons";
import type { TBuildingRefusal } from "./buildingRules";

const spring = 0;
const summer = 28;
const nextYear = 112;

const lineOf = (refusal: TBuildingRefusal, viewDate = spring + 2) => {
  const { icon, text } = describeRefusal(refusal, viewDate);

  return `${icon} ${text}`;
};

describe("describeRefusal", () => {
  it("gives the reasons of the house and the greenhouse", () => {
    expect(lineOf({ level: 2, type: "houseBuilt" })).toBe(
      "❌ The Farmhouse has a Nursery already",
    );
    expect(lineOf({ type: "repaired" })).toBe(
      "🌿 The Greenhouse is repaired already",
    );
  });

  it("gives the reason of a paint on a building that has the look already", () => {
    expect(lineOf({ buildingId: "cabin", type: "painted" })).toBe(
      "🎨 The Cabin has this look already",
    );
    expect(lineOf({ buildingId: "pet_bowl", type: "painted" })).toBe(
      "🎨 The Pet Bowl has this look already",
    );
  });

  it.each<[TBuildingRefusal, string]>([
    [
      {
        block: { level: 2, type: "level" },
        buildingId: "farmhouse",
        type: "unpaintable",
      },
      "🍼 Paint needs the Nursery",
    ],
    [
      {
        block: { level: 2, type: "level" },
        buildingId: "cabin",
        type: "unpaintable",
      },
      "🏠 Paint needs a Cabin upgrade (not in the planner)",
    ],
    [
      {
        block: { type: "none", upgradeId: "deluxe_barn" },
        buildingId: "big_barn",
        type: "unpaintable",
      },
      "🎨 Paint needs the Deluxe Barn upgrade",
    ],
    [
      { block: { type: "none" }, buildingId: "silo", type: "unpaintable" },
      "🎨 The Silo cannot take paint",
    ],
    [
      { buildingId: "stable", hasPaint: true, type: "colored" },
      "🎨 The Stable has these colours already",
    ],
    [
      { buildingId: "farmhouse", hasPaint: false, type: "colored" },
      "🎨 The Farmhouse has no paint already",
    ],
  ])("gives the paint refusal %#", (refusal, line) => {
    expect(lineOf(refusal)).toBe(line);
  });

  it("gives the count limits", () => {
    expect(
      lineOf({ buildingId: "cabin", limit: "cabins", type: "limit" }),
    ).toBe("🏠 You can have only 7 cabins");
    expect(
      lineOf({ buildingId: "stable", limit: "perCabin", type: "limit" }),
    ).toBe("🐴 Each Stable after the first needs a cabin");
  });

  it.each<[TBuildingRefusal, string]>([
    [
      {
        blocker: { date: spring + 2, thing: "crop", type: "thing" },
        type: "tile",
      },
      "🌱 A crop is here",
    ],
    [
      {
        blocker: { date: summer + 2, thing: "crop", type: "thing" },
        type: "tile",
      },
      "🌱 A crop is here on Su 3",
    ],
    [
      {
        blocker: { date: spring + 9, thing: "tree", type: "thing" },
        type: "tile",
      },
      "🌳 A tree is here on Sp 10",
    ],
    [
      {
        blocker: { date: spring + 2, thing: "bush", type: "thing" },
        type: "tile",
      },
      "🌿 A bush is here",
    ],
    [
      {
        blocker: { date: spring + 2, thing: "floor", type: "thing" },
        type: "tile",
      },
      "🧱 A floor is here",
    ],
    [
      {
        blocker: { date: spring + 2, thing: "item", type: "thing" },
        type: "tile",
      },
      "📦 An item is here",
    ],
    [
      {
        blocker: {
          buildingId: "barn",
          date: spring + 2,
          isFixed: false,
          type: "building",
        },
        type: "tile",
      },
      "🏡 A Barn is here",
    ],
    [
      {
        blocker: {
          buildingId: "earth_obelisk",
          date: spring + 20,
          isFixed: false,
          type: "building",
        },
        type: "tile",
      },
      "🏡 An Earth Obelisk is here on Sp 21",
    ],
    [
      {
        blocker: {
          buildingId: "farmhouse",
          date: spring + 2,
          isFixed: true,
          type: "building",
        },
        type: "tile",
      },
      "🏡 The Farmhouse is here",
    ],
    [
      { blocker: { type: "door" }, type: "tile" },
      "🚪 Keep the tile below the door clear",
    ],
    [{ blocker: { type: "ground" }, type: "tile" }, "🚫 You cannot build here"],
    [
      { blocker: { type: "water" }, type: "tile" },
      "🌊 You cannot build on water",
    ],
  ])("gives the tile reason %#", (refusal, line) => {
    expect(lineOf(refusal)).toBe(line);
  });

  it.each<[TBuildingRefusal, string]>([
    [
      { fromId: "barn", type: "upgrade", upgradeId: "big_coop" },
      "❌ You cannot upgrade a Barn to a Big Coop",
    ],
    [
      { fromId: "big_coop", type: "upgrade", upgradeId: "big_coop" },
      "❌ You cannot upgrade a Big Coop to a Big Coop",
    ],
  ])("gives the upgrade refusal %#", (refusal, line) => {
    expect(lineOf(refusal)).toBe(line);
  });
});

describe("describeNextGoodDate", () => {
  it("gives the next good day", () => {
    expect(describeNextGoodDate(spring + 5, spring + 1)).toEqual({
      icon: "📅",
      text: "Next good day: Sp 6",
    });
  });

  it("gives the year of a date in another year", () => {
    expect(describeNextGoodDate(nextYear + 5, spring + 1).text).toBe(
      "Next good day: Sp 6, Y2",
    );
  });
});
