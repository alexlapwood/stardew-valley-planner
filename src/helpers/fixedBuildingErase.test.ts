import { testFarmMap } from "../__mocks__/testFarmMap";
import { planFarmErase, planFixedErase } from "./fixedBuildingErase";
import type { ICurrentItems } from "./itemPlacement";

const spring = 0;

// The farmhouse of the test farm covers x 59-67 and y 12-16, and the
// greenhouse covers x 25-31 and y 10-15.
const onHouse = { x1: 62, x2: 62, y1: 14, y2: 14 };
const onGreenhouse = { x1: 27, x2: 27, y1: 12, y2: 12 };
const awayFromBoth = { x1: 40, x2: 40, y1: 30, y2: 30 };

const kitchen = { datePlaced: spring + 2, level: 1 };
const nursery = { datePlaced: spring + 5, level: 2 };
const repair = { datePlaced: spring + 4 };

function items(fields: Partial<ICurrentItems> = {}): ICurrentItems {
  return {
    currentCrops: {},
    currentEquipment: {},
    currentGreenhouseRepair: repair,
    currentHouseUpgrades: [kitchen, nursery],
    ...fields,
  };
}

const eraseOn = (
  region: typeof onHouse,
  date: number,
  fields: Partial<ICurrentItems> = {},
) => planFixedErase(items(fields), testFarmMap, region, date);

describe("planFixedErase on the farmhouse", () => {
  it("takes back the upgrade on its date and the later ones, and shows the house tiles", () => {
    const erase = eraseOn(onHouse, spring + 5);

    expect(erase.houseUpgrades).toEqual([kitchen]);
    expect(erase.tiles).toHaveLength(9 * 5);
    expect(erase.tiles).toContainEqual({ x: 59, y: 12 });
    expect(erase.greenhouseRepair).toBe(repair);
  });

  it("takes back all the levels on the date of the first level", () => {
    expect(eraseOn(onHouse, spring + 2).houseUpgrades).toEqual([]);
  });

  it.each([
    ["between 2 upgrades", spring + 3],
    ["after the last upgrade", spring + 9],
    ["before the first upgrade", spring + 1],
  ])(
    "keeps the house as it is %s, with no tiles, because the game cannot take a level back or demolish the house",
    (_, date) => {
      const erase = eraseOn(onHouse, date);

      expect(erase.houseUpgrades).toEqual([kitchen, nursery]);
      expect(erase.tiles).toEqual([]);
    },
  );
});

describe("planFixedErase on the greenhouse", () => {
  it.each([
    ["the repair day", spring + 4],
    ["a later day", spring + 40],
  ])("takes the repair out of the plan on %s", (_, date) => {
    const erase = eraseOn(onGreenhouse, date);

    expect(erase.greenhouseRepair).toBeUndefined();
    expect(erase.tiles).toHaveLength(7 * 6);
    expect(erase.houseUpgrades).toEqual([kitchen, nursery]);
  });

  it("keeps a repair that comes after the date, and a greenhouse with no repair", () => {
    expect(eraseOn(onGreenhouse, spring + 3).greenhouseRepair).toBe(repair);
    expect(
      eraseOn(onGreenhouse, spring + 3, { currentGreenhouseRepair: undefined })
        .tiles,
    ).toEqual([]);
  });
});

describe("planFixedErase away from the fixed buildings", () => {
  it("changes nothing", () => {
    const erase = eraseOn(awayFromBoth, spring + 6);

    expect(erase.houseUpgrades).toEqual([kitchen, nursery]);
    expect(erase.greenhouseRepair).toBe(repair);
    expect(erase.tiles).toEqual([]);
  });
});

describe("planFarmErase", () => {
  const silo: IPlannedBuilding = {
    buildingId: "silo",
    datePlaced: spring,
    x: 68,
    y: 14,
  };

  it("erases the buildings and the house upgrade in the region on the same day, with no rules for Robin", () => {
    const erase = planFarmErase(
      items({ currentBuildings: [silo], currentHouseUpgrades: [kitchen] }),
      testFarmMap,
      { x1: 66, x2: 68, y1: 14, y2: 14 },
      spring + 2,
    );

    expect(erase.fixed.houseUpgrades).toEqual([]);
    expect(erase.buildings).toEqual([silo]);
  });
});
