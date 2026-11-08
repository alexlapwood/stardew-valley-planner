import {
  chainUpgrades,
  findBadUpgrade,
  getBaseBuildingId,
  getTierOn,
  getTiers,
  getTiersOver,
  getTopBuildingId,
  getUpgradePath,
  orderChain,
  orderUpgrade,
} from "./buildingTiers";

const spring = 0;

function barn(overrides: Partial<IPlannedBuilding> = {}): IPlannedBuilding {
  return {
    buildingId: "barn",
    datePlaced: spring,
    x: 10,
    y: 20,
    ...overrides,
  };
}

// Barn from Spring 1, Big Barn from Spring 4, Deluxe Barn from Spring 6.
const deluxeChain = barn({
  upgrades: [
    { buildingId: "big_barn", datePlaced: spring + 3 },
    { buildingId: "deluxe_barn", datePlaced: spring + 5 },
  ],
});

describe("the tier ladder", () => {
  it("finds the lowest tier of a building", () => {
    expect(getBaseBuildingId("deluxe_barn")).toBe("barn");
    expect(getBaseBuildingId("big_shed")).toBe("shed");
    expect(getBaseBuildingId("silo")).toBe("silo");
  });

  it("gives the tiers above a building, up to the tier asked for", () => {
    expect(getUpgradePath("barn", "deluxe_barn")).toEqual([
      "big_barn",
      "deluxe_barn",
    ]);
    expect(getUpgradePath("big_coop", "deluxe_coop")).toEqual(["deluxe_coop"]);
  });

  it("gives no tiers for the same tier, a lower tier or another building", () => {
    expect(getUpgradePath("barn", "barn")).toBeUndefined();
    expect(getUpgradePath("deluxe_barn", "big_barn")).toBeUndefined();
    expect(getUpgradePath("barn", "big_coop")).toBeUndefined();
  });
});

const tierIds = (firstDay: number, lastDay?: number) =>
  getTiersOver(deluxeChain, { firstDay, lastDay }).map(
    ({ buildingId }) => buildingId,
  );

describe("the tiers of a planned building", () => {
  it("has each tier from its own date, with no build days", () => {
    expect(getTiers(deluxeChain)).toEqual([
      { buildingId: "barn", datePlaced: 0 },
      { buildingId: "big_barn", datePlaced: 3 },
      { buildingId: "deluxe_barn", datePlaced: 5 },
    ]);
    expect(getTopBuildingId(deluxeChain)).toBe("deluxe_barn");
    expect(getTopBuildingId(barn())).toBe("barn");
  });

  it("shows each tier from the date of its upgrade", () => {
    expect(
      [0, 2, 3, 4, 5, 50].map(
        (date) => getTierOn(deluxeChain, date).buildingId,
      ),
    ).toEqual([
      "barn",
      "barn",
      "big_barn",
      "big_barn",
      "deluxe_barn",
      "deluxe_barn",
    ]);
  });

  it("finds each tier that stands on some of the days", () => {
    expect(tierIds(0, 2)).toEqual(["barn"]);
    expect(tierIds(2, 3)).toEqual(["barn", "big_barn"]);
    expect(tierIds(5)).toEqual(["deluxe_barn"]);
    expect(getTiersOver(barn({ dateDestroyed: 8 }), { firstDay: 8 })).toEqual(
      [],
    );
  });

  it("has a tier that the next tier follows on the same date stand on no day", () => {
    const sameDay = barn({ ...orderChain("deluxe_barn", spring + 4) });

    expect(getTierOn(sameDay, spring + 4).buildingId).toBe("deluxe_barn");
    expect(
      getTiersOver(sameDay, { firstDay: 0 }).map(
        ({ buildingId }) => buildingId,
      ),
    ).toEqual(["deluxe_barn"]);
  });
});

describe("chains on empty ground", () => {
  it("puts the lowest tier and each upgrade up to the tier down on the same date", () => {
    expect(orderChain("deluxe_barn", spring + 9)).toEqual({
      buildingId: "barn",
      datePlaced: spring + 9,
      upgrades: [
        { buildingId: "big_barn", datePlaced: spring + 9 },
        { buildingId: "deluxe_barn", datePlaced: spring + 9 },
      ],
    });
  });

  it("puts only the building down for the lowest tier", () => {
    expect(orderChain("coop", spring + 4)).toEqual({
      buildingId: "coop",
      datePlaced: spring + 4,
    });
  });

  it("gives each upgrade of a chain the date", () => {
    expect(chainUpgrades(["big_coop", "deluxe_coop"], spring + 3)).toEqual([
      { buildingId: "big_coop", datePlaced: spring + 3 },
      { buildingId: "deluxe_coop", datePlaced: spring + 3 },
    ]);
  });
});

describe("orderUpgrade", () => {
  it("upgrades to the next tier on the date, also on the date of the building", () => {
    expect(orderUpgrade(barn(), "big_barn", spring + 10)).toEqual(
      barn({
        upgrades: [{ buildingId: "big_barn", datePlaced: spring + 10 }],
      }),
    );
    expect(orderUpgrade(barn(), "big_barn", spring)).toEqual(
      barn({ upgrades: [{ buildingId: "big_barn", datePlaced: spring }] }),
    );
  });

  it("upgrades to each tier up to a higher one on the same date", () => {
    expect(orderUpgrade(barn(), "deluxe_barn", spring + 20)).toEqual(
      barn({
        upgrades: [
          { buildingId: "big_barn", datePlaced: spring + 20 },
          { buildingId: "deluxe_barn", datePlaced: spring + 20 },
        ],
      }),
    );
  });

  it("keeps an upgrade on the same date, and adds the next tier after it", () => {
    const upgraded = barn({
      upgrades: [{ buildingId: "big_barn", datePlaced: spring + 3 }],
    });

    expect(orderUpgrade(upgraded, "deluxe_barn", spring + 3)).toEqual(
      barn({
        upgrades: [
          { buildingId: "big_barn", datePlaced: spring + 3 },
          { buildingId: "deluxe_barn", datePlaced: spring + 3 },
        ],
      }),
    );
  });

  it("takes the place of the upgrades planned after the date", () => {
    const planned = barn({
      upgrades: [
        { buildingId: "big_barn", datePlaced: spring + 5 },
        { buildingId: "deluxe_barn", datePlaced: spring + 40 },
      ],
    });

    expect(orderUpgrade(planned, "deluxe_barn", spring + 20)).toEqual(
      barn({
        upgrades: [
          { buildingId: "big_barn", datePlaced: spring + 5 },
          { buildingId: "deluxe_barn", datePlaced: spring + 20 },
        ],
      }),
    );
  });

  it("refuses a tier that is not above the building on the date", () => {
    expect(orderUpgrade(barn(), "big_coop", spring + 10)).toBeUndefined();
    expect(orderUpgrade(deluxeChain, "big_barn", spring + 10)).toBeUndefined();
    expect(
      orderUpgrade(deluxeChain, "deluxe_barn", spring + 5),
    ).toBeUndefined();
  });
});

describe("findBadUpgrade", () => {
  it("finds no bad upgrade in a ladder of tiers, also on the same date", () => {
    expect(findBadUpgrade(deluxeChain)).toBe(-1);
    expect(findBadUpgrade(barn())).toBe(-1);
    expect(findBadUpgrade(barn({ ...orderChain("deluxe_barn", 7) }))).toBe(-1);
  });

  it("finds the first upgrade that skips a tier, comes before the tier below it or is on or after the demolish", () => {
    expect(
      findBadUpgrade(
        barn({ upgrades: [{ buildingId: "deluxe_barn", datePlaced: 10 }] }),
      ),
    ).toBe(0);
    expect(
      findBadUpgrade(
        barn({
          upgrades: [
            { buildingId: "big_barn", datePlaced: 3 },
            { buildingId: "deluxe_barn", datePlaced: 2 },
          ],
        }),
      ),
    ).toBe(1);
    expect(
      findBadUpgrade(
        barn({
          datePlaced: 5,
          upgrades: [{ buildingId: "big_barn", datePlaced: 4 }],
        }),
      ),
    ).toBe(0);
    expect(findBadUpgrade({ ...deluxeChain, dateDestroyed: 5 })).toBe(1);
  });
});
