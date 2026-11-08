import {
  eraseEachBuilding,
  findBuildingsToErase,
  getRemovedBuildings,
  touchesRegion,
} from "./buildingErase";

const spring = 0;

function building(
  buildingId: string,
  datePlaced: number,
  x: number,
  overrides: Partial<IPlannedBuilding> = {},
): IPlannedBuilding {
  return { buildingId, datePlaced, x, y: 20, ...overrides };
}

// Coop from Spring 1, Big Coop from Spring 5, Deluxe Coop from Spring 9.
const coop = building("coop", spring, 10, {
  paints: [{ datePainted: spring + 6, skin: "coop" }],
  skin: "coop",
  upgrades: [
    { buildingId: "big_coop", datePlaced: spring + 4 },
    { buildingId: "deluxe_coop", datePlaced: spring + 8 },
  ],
});

const onCoop = { x1: 12, x2: 12, y1: 21, y2: 21 };

const erase = (date: number, plan: IPlannedBuilding[] = [coop]) =>
  eraseEachBuilding(plan, findBuildingsToErase(plan, onCoop, date), date);

describe("an erase on the date the building goes down", () => {
  it("takes the building out of the plan, with all its tiers and paints", () => {
    expect(erase(spring)).toEqual([]);
    expect(getRemovedBuildings([coop], spring)).toEqual([coop]);
  });

  it("takes out a building with a chain on the same date", () => {
    const chain = building("coop", spring + 3, 10, {
      upgrades: [
        { buildingId: "big_coop", datePlaced: spring + 3 },
        { buildingId: "deluxe_coop", datePlaced: spring + 3 },
      ],
    });

    expect(erase(spring + 3, [chain])).toEqual([]);
  });
});

describe("an erase on the date of an upgrade", () => {
  it("takes back that upgrade and the later ones, and keeps the lower tier and the paints", () => {
    expect(erase(spring + 4)).toEqual([
      building("coop", spring, 10, {
        paints: coop.paints,
        skin: "coop",
      }),
    ]);
    expect(erase(spring + 8)).toEqual([
      { ...coop, upgrades: coop.upgrades?.slice(0, 1) },
    ]);
    expect(getRemovedBuildings([coop], spring + 4)).toEqual([]);
  });
});

describe("an erase on another later date", () => {
  it("demolishes the building from that date, and drops the later upgrades and paints", () => {
    expect(erase(spring + 5)).toEqual([
      building("coop", spring, 10, {
        dateDestroyed: spring + 5,
        skin: "coop",
        upgrades: coop.upgrades?.slice(0, 1),
      }),
    ]);
    expect(getRemovedBuildings([coop], spring + 5)).toEqual([]);
  });

  it("demolishes any building on any day, with no rules for Robin", () => {
    const tuesday = spring + 1;
    const hut = building("junimo_hut", spring, 10);
    const cabin = building("cabin", spring + 2, 10);
    const plan = [
      building("stable", spring, 30),
      cabin,
      building("stable", spring + 3, 40),
    ];

    expect(erase(tuesday, [hut])).toEqual([{ ...hut, dateDestroyed: tuesday }]);
    expect(erase(spring + 5, plan)).toEqual([
      plan[0],
      { ...cabin, dateDestroyed: spring + 5 },
      plan[2],
    ]);
  });

  it("demolishes a starter building from a later day", () => {
    const starterCoop = building("coop", spring, 10, { starter: true });

    expect(erase(spring, [starterCoop])).toEqual([]);
    expect(erase(spring + 1, [starterCoop])).toEqual([
      { ...starterCoop, dateDestroyed: spring + 1 },
    ]);
  });
});

describe("findBuildingsToErase", () => {
  it("finds only the buildings on the date", () => {
    const gone = building("coop", spring, 10, { dateDestroyed: spring + 3 });

    expect(findBuildingsToErase([gone], onCoop, spring + 2)).toEqual([gone]);
    expect(findBuildingsToErase([gone], onCoop, spring + 3)).toEqual([]);
  });

  it("finds a spot that a region touches from any corner", () => {
    const spot = { height: 2, width: 3, x: 10, y: 20 };

    expect(touchesRegion(spot, { x1: 14, x2: 12, y1: 25, y2: 21 })).toBe(true);
    expect(touchesRegion(spot, { x1: 13, x2: 14, y1: 20, y2: 20 })).toBe(false);
  });
});
