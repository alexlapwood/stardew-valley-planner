import { testFarmMap } from "../__mocks__/testFarmMap";
import {
  checkBuildingOrder,
  findNextOrderDate,
  type IOrderRequest,
} from "./buildingOrders";

const spring = 0;
const summer = 28;

function building(
  buildingId: string,
  datePlaced: number,
  x: number,
  overrides: Partial<IPlannedBuilding> = {},
): IPlannedBuilding {
  return { buildingId, datePlaced, x, y: 30, ...overrides };
}

function scarecrow(
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "scarecrow",
    skin: "scarecrow",
    type: "equipment",
    x,
    y,
    ...overrides,
  };
}

interface IRequestOptions {
  buildings?: IPlannedBuilding[];
  equipment?: IInstalledEquipment[];
  x?: number;
}

// The cursor is on 40, 30 unless the test moves it, and the coop there covers
// x 40-45 and y 30-32.
function request(
  buildingId: string,
  date: number,
  { buildings = [], equipment = [], x = 40 }: IRequestOptions = {},
): IOrderRequest {
  const currentEquipment: IFarmEquipment = {};

  equipment.forEach((installed) => {
    currentEquipment[installed.y] = {
      ...currentEquipment[installed.y],
      [installed.x]: [installed],
    };
  });

  return {
    buildingId,
    currentItems: {
      currentBuildings: buildings,
      currentCrops: {},
      currentEquipment,
    },
    date,
    farmMap: testFarmMap,
    region: { x1: x, x2: x, y1: 30, y2: 30 },
  };
}

const check = (...args: Parameters<typeof request>) =>
  checkBuildingOrder(request(...args));

const cabins = (count: number, overrides: Partial<IPlannedBuilding> = {}) =>
  Array.from({ length: count }, (_, index) =>
    building("cabin", spring, index * 6, { y: 40, ...overrides }),
  );

const starterCoop = (x: number) =>
  building("coop", spring, x, { starter: true });

describe("a starter building", () => {
  it("leaves day 0 open for other buildings", () => {
    expect(
      check("barn", spring, { buildings: [starterCoop(10)] }).refusal,
    ).toBeUndefined();
  });

  it("takes an upgrade on day 0, and stays a starter building", () => {
    const order = check("big_coop", spring, { buildings: [starterCoop(40)] });

    expect(order.refusal).toBeUndefined();
    expect(order.after).toEqual([
      {
        ...starterCoop(40),
        upgrades: [{ buildingId: "big_coop", datePlaced: spring }],
      },
    ]);
  });
});

describe("any day", () => {
  it.each([
    ["Spring 2, a Tuesday", spring + 1],
    ["the Egg Festival, Spring 13", spring + 12],
    ["Summer 18, when Robin is away", summer + 17],
  ])("puts a building down on %s", (_, date) => {
    const order = check("coop", date);

    expect(order.refusal).toBeUndefined();
    expect(order.check.freeTiles).toHaveLength(6 * 3);
  });

  it("puts many buildings down and upgrades them on the same day", () => {
    const otherCoop = building("coop", spring + 2, 10);
    const barn = building("barn", spring + 2, 20, { y: 40 });

    expect(
      check("coop", spring + 2, { buildings: [otherCoop, barn] }).refusal,
    ).toBeUndefined();
    expect(
      check("big_coop", spring + 2, { buildings: [otherCoop, barn], x: 10 })
        .refusal,
    ).toBeUndefined();
  });

  it("puts a chain down on the date, with each tier on the same date", () => {
    const order = check("deluxe_coop", summer);

    expect(order.refusal).toBeUndefined();
    expect(order.after).toEqual([
      building("coop", summer, 40, {
        upgrades: [
          { buildingId: "big_coop", datePlaced: summer },
          { buildingId: "deluxe_coop", datePlaced: summer },
        ],
      }),
    ]);
  });
});

describe("the reasons", () => {
  it("gives the tile reason first, with the tiles that are taken", () => {
    const order = check("coop", spring + 1, {
      equipment: [scarecrow(41, 31)],
    });

    expect(order.refusal).toEqual({
      blocker: { date: spring + 1, thing: "item", type: "thing" },
      type: "tile",
    });
    expect(order.check.blockedTiles).toEqual([{ x: 41, y: 31 }]);
  });

  it("gives the count limit, with all the tiles red", () => {
    const order = check("cabin", spring + 1, { buildings: cabins(7) });

    expect(order.refusal).toEqual({
      buildingId: "cabin",
      limit: "cabins",
      type: "limit",
    });
    expect(order.check.fits).toBe(false);
    expect(order.check.freeTiles).toEqual([]);
  });

  it("refuses an upgrade to a tier that is not above the building on the date", () => {
    const coop = building("coop", spring + 2, 40, {
      upgrades: [{ buildingId: "big_coop", datePlaced: spring + 2 }],
    });

    expect(
      check("big_coop", spring + 3, { buildings: [coop] }).refusal,
    ).toEqual({ fromId: "big_coop", type: "upgrade", upgradeId: "big_coop" });
    expect(
      check("big_barn", spring + 3, { buildings: [coop] }).refusal,
    ).toEqual({ fromId: "big_coop", type: "upgrade", upgradeId: "big_barn" });
  });

  it("puts the new building in the plan only when nothing refuses it", () => {
    const order = check("coop", spring + 2);

    expect(order.refusal).toBeUndefined();
    expect(order.after).toEqual([building("coop", spring + 2, 40)]);
    expect(order.check.freeTiles).toHaveLength(6 * 3);
  });
});

const floor = (x: number, y: number, dateDestroyed?: number) =>
  scarecrow(x, y, {
    equipmentId: "flooring",
    skin: "wood_floor",
    ...(dateDestroyed === undefined ? {} : { dateDestroyed }),
  });

describe("a Well on floors", () => {
  it("keeps the floors that it takes off, with the end day that each had", () => {
    const order = check("well", spring + 2, {
      equipment: [floor(41, 31, spring + 20), floor(42, 32)],
    });
    const well = building("well", spring + 2, 40, {
      endedFloors: [
        { dateDestroyed: spring + 20, dateInstalled: 0, x: 41, y: 31 },
        { dateInstalled: 0, x: 42, y: 32 },
      ],
    });

    expect(order.refusal).toBeUndefined();
    expect(order.after).toEqual([well]);
    expect(order.click).toEqual({ plannedBuilding: well, type: "new" });
  });

  it("keeps no floors for a floor that is gone on the order day", () => {
    expect(
      check("well", spring + 2, { equipment: [floor(41, 31, spring + 2)] })
        .after,
    ).toStrictEqual([building("well", spring + 2, 40)]);
  });
});

describe("findNextOrderDate", () => {
  it("finds the day after a thing on the tiles is gone", () => {
    expect(
      findNextOrderDate(
        request("coop", spring + 2, {
          equipment: [scarecrow(41, 31, { dateDestroyed: spring + 8 })],
        }),
      ),
    ).toBe(spring + 8);
  });

  it("finds no day while a thing stays on the tiles", () => {
    expect(
      findNextOrderDate(
        request("coop", spring + 2, { equipment: [scarecrow(41, 31)] }),
      ),
    ).toBeUndefined();
  });

  it("finds the day that a cabin is demolished for an 8th cabin, and no day while 7 stay", () => {
    const [demolished, ...others] = cabins(7);

    expect(
      findNextOrderDate(
        request("cabin", spring + 2, {
          buildings: [{ ...demolished, dateDestroyed: spring + 10 }, ...others],
        }),
      ),
    ).toBe(spring + 10);
    expect(
      findNextOrderDate(request("cabin", spring + 2, { buildings: cabins(7) })),
    ).toBeUndefined();
  });

  it("finds no day for an upgrade, because the tiers only go up", () => {
    const coop = building("coop", spring, 40, {
      upgrades: [{ buildingId: "big_coop", datePlaced: spring }],
    });

    expect(
      findNextOrderDate(request("big_coop", spring + 3, { buildings: [coop] })),
    ).toBeUndefined();
  });
});

function withSkin(buildingId: string, skin: string): IOrderRequest {
  return { ...request(buildingId, spring + 2), skin };
}

describe("skins", () => {
  it("puts a new building down with the skin that is picked, with the same rules", () => {
    const order = checkBuildingOrder(withSkin("cabin", "log_cabin"));
    const cabin = building("cabin", spring + 2, 40, { skin: "log_cabin" });

    expect(order.refusal).toBeUndefined();
    expect(order.click).toEqual({ plannedBuilding: cabin, type: "new" });
    expect(order.after).toEqual([cabin]);
  });

  it("puts the look with no skin, or a skin that the building does not have, down with no skin", () => {
    expect(checkBuildingOrder(withSkin("cabin", "cabin")).after).toStrictEqual([
      building("cabin", spring + 2, 40),
    ]);
    expect(
      checkBuildingOrder(withSkin("coop", "log_cabin")).after,
    ).toStrictEqual([building("coop", spring + 2, 40)]);
  });
});
