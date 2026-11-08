import { getFarmLooksOn } from "./farmLooks";

const colors: TPaintColors = {
  Roof: { hue: 200, lightness: -12, saturation: 50 },
};

const nursery: IPlannedHouseUpgrade[] = [
  { datePlaced: 3, level: 1 },
  { datePlaced: 6, level: 2 },
];

const houseColorPaints: IPlannedColorPaint[] = [{ colors, datePainted: 8 }];

describe("getFarmLooksOn", () => {
  it("has no house colours with no house paint", () => {
    expect(getFarmLooksOn({}, 9)).toEqual({
      greenhouse: "broken",
      house: "upgrade_0",
      petBowl: "pet_bowl",
    });
  });

  it("gives the house its colours from the date of the paint", () => {
    expect(
      getFarmLooksOn(
        {
          currentHouseColorPaints: houseColorPaints,
          currentHouseUpgrades: nursery,
        },
        7,
      ).houseColors,
    ).toBeUndefined();
    expect(
      getFarmLooksOn(
        {
          currentHouseColorPaints: houseColorPaints,
          currentHouseUpgrades: nursery,
        },
        8,
      ),
    ).toEqual({
      greenhouse: "broken",
      house: "upgrade_2",
      houseColors: colors,
      petBowl: "pet_bowl",
    });
  });

  it("hides the paint on the days that the house is below the Nursery, such as after the Nursery is erased", () => {
    expect(
      getFarmLooksOn(
        {
          currentHouseColorPaints: houseColorPaints,
          currentHouseUpgrades: nursery.slice(0, 1),
        },
        9,
      ).houseColors,
    ).toBeUndefined();
  });
});
