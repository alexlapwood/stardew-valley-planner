import { testFarmMap } from "../__mocks__/testFarmMap";
import { checkBuildingOrder } from "./buildingOrders";
import {
  checkFixedOrder,
  type IFixedOrderRequest,
  type IFixedUpgradeItem,
  isFixedUpgradeItem,
} from "./fixedBuildingOrders";
import type { ICurrentItems } from "./itemPlacement";

const spring = 0;
const summer = 28;

// The farmhouse of the test farm covers x 59-67 and y 12-16, and the
// greenhouse covers x 25-31 and y 10-15.
const onHouse = { x1: 62, x2: 62, y1: 14, y2: 14 };
const onGreenhouse = { x1: 27, x2: 27, y1: 12, y2: 12 };

const repairItem: IFixedUpgradeItem = {
  id: "greenhouse",
  type: "greenhouseRepair",
};

function items(fields: Partial<ICurrentItems> = {}): ICurrentItems {
  return { currentCrops: {}, currentEquipment: {}, ...fields };
}

function houseRequest(
  level: number,
  date: number,
  fields: Partial<ICurrentItems> = {},
): IFixedOrderRequest {
  return {
    currentItems: items(fields),
    date,
    farmMap: testFarmMap,
    item: { id: String(level), type: "houseUpgrade" },
    region: onHouse,
  };
}

function repairRequest(
  date: number,
  fields: Partial<ICurrentItems> = {},
): IFixedOrderRequest {
  return {
    currentItems: items(fields),
    date,
    farmMap: testFarmMap,
    item: repairItem,
    region: onGreenhouse,
  };
}

function coopOn(datePlaced: number): IPlannedBuilding {
  return { buildingId: "coop", datePlaced, x: 40, y: 30 };
}

describe("isFixedUpgradeItem", () => {
  it("is a house level or the greenhouse repair", () => {
    expect(isFixedUpgradeItem({ id: "1", type: "houseUpgrade" })).toBe(true);
    expect(isFixedUpgradeItem(repairItem)).toBe(true);
    expect(isFixedUpgradeItem({ id: "coop", type: "building" })).toBe(false);
    expect(isFixedUpgradeItem(undefined)).toBe(false);
  });
});

describe("house upgrade orders", () => {
  it("upgrades the farmhouse to the level, with all its tiles green", () => {
    const order = checkFixedOrder(houseRequest(1, spring + 2));

    expect(order?.change).toEqual({
      houseColorPaints: [],
      houseUpgrades: [{ datePlaced: spring + 2, level: 1 }],
      type: "houseUpgrade",
    });
    expect(order?.refusal).toBeUndefined();
    expect(order?.check.freeTiles).toHaveLength(9 * 5);
    expect(order?.check.freeTiles).toContainEqual({ x: 67, y: 16 });
    expect(order?.check.blockedTiles).toEqual([]);
  });

  it("is no order when the cursor is off the farmhouse", () => {
    expect(
      checkFixedOrder({
        ...houseRequest(1, spring + 2),
        region: { x1: 58, x2: 58, y1: 14, y2: 14 },
      }),
    ).toBeUndefined();
  });

  it.each([
    ["Spring 2, a Tuesday", spring + 1],
    ["the Egg Festival", spring + 12],
    ["Summer 18, when Robin is away", summer + 17],
  ])("upgrades on %s", (_, date) => {
    expect(checkFixedOrder(houseRequest(1, date))?.refusal).toBeUndefined();
  });

  it("upgrades the house on the same day as a building, and a building on the day of a house upgrade", () => {
    const houseUpgrades = [{ datePlaced: spring + 2, level: 1 }];

    expect(
      checkFixedOrder(
        houseRequest(1, spring + 2, { currentBuildings: [coopOn(spring + 2)] }),
      )?.refusal,
    ).toBeUndefined();
    expect(
      checkBuildingOrder({
        buildingId: "coop",
        currentItems: items({ currentHouseUpgrades: houseUpgrades }),
        date: spring + 2,
        farmMap: testFarmMap,
        region: { x1: 40, x2: 40, y1: 30, y2: 30 },
      }).refusal,
    ).toBeUndefined();
  });

  it("chains each level up to the selected one on the date", () => {
    expect(checkFixedOrder(houseRequest(3, spring + 4))?.change).toEqual({
      houseColorPaints: [],
      houseUpgrades: [
        { datePlaced: spring + 4, level: 1 },
        { datePlaced: spring + 4, level: 2 },
        { datePlaced: spring + 4, level: 3 },
      ],
      type: "houseUpgrade",
    });
  });

  describe("the paint of the house", () => {
    // A Nursery from day 10, and paint on day 15.
    const withNursery = {
      currentHouseColorPaints: [
        {
          colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
          datePainted: spring + 15,
        },
      ],
      currentHouseUpgrades: [
        { datePlaced: spring + 10, level: 1 },
        { datePlaced: spring + 10, level: 2 },
      ],
    };

    it("takes out the paint that only the levels it takes the place of could show", () => {
      expect(
        checkFixedOrder(houseRequest(1, spring + 5, withNursery))?.change,
      ).toEqual({
        houseColorPaints: [],
        houseUpgrades: [{ datePlaced: spring + 5, level: 1 }],
        type: "houseUpgrade",
      });
    });

    it("keeps the paint that the new levels can show", () => {
      expect(
        checkFixedOrder(houseRequest(2, spring + 5, withNursery))?.change,
      ).toEqual({
        houseColorPaints: withNursery.currentHouseColorPaints,
        houseUpgrades: [
          { datePlaced: spring + 5, level: 1 },
          { datePlaced: spring + 5, level: 2 },
        ],
        type: "houseUpgrade",
      });
    });
  });

  it("refuses a level that the house has on the date, with all the tiles red", () => {
    const order = checkFixedOrder(
      houseRequest(1, spring + 2, {
        currentHouseUpgrades: [{ datePlaced: spring + 2, level: 1 }],
      }),
    );

    expect(order?.refusal).toEqual({ level: 1, type: "houseBuilt" });
    expect(order?.change).toBeUndefined();
    expect(order?.check.blockedTiles).toHaveLength(9 * 5);
    expect(order?.check.freeTiles).toEqual([]);
  });
});

describe("greenhouse repair orders", () => {
  it("repairs the greenhouse on any day", () => {
    const order = checkFixedOrder(
      repairRequest(spring + 1, { currentBuildings: [coopOn(spring)] }),
    );

    expect(order?.change).toEqual({
      greenhouseRepair: { datePlaced: spring + 1 },
      type: "greenhouseRepair",
    });
    expect(order?.check.freeTiles).toHaveLength(7 * 6);
  });

  it("refuses a repair on or after the repair date", () => {
    expect(
      checkFixedOrder(
        repairRequest(spring + 2, {
          currentGreenhouseRepair: { datePlaced: spring + 2 },
        }),
      )?.refusal,
    ).toEqual({ type: "repaired" });
  });

  it("is no order when the cursor is off the greenhouse", () => {
    expect(
      checkFixedOrder({ ...repairRequest(spring), region: onHouse }),
    ).toBeUndefined();
  });
});
