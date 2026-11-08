import { buildings } from "../data/game/buildings.json";
import {
  eraseEachBuilding,
  findBuildingsToErase,
  getRemovedBuildings,
} from "./buildingErase";
import {
  buildingForRegion,
  getBuildingChangeDays,
  getBuildingClick,
  getBuildingsOn,
  getFootprintTiles,
  getPlacedBuildingsOn,
  getPlacedBuildingsOver,
  isGroundBuilding,
  isOnPlannedBuilding,
  isPlannableBuilding,
  plannableBuildingIds,
  replaceBuilding,
  toPreviewBuilding,
} from "./plannedBuildings";

function barn(overrides: Partial<IPlannedBuilding> = {}): IPlannedBuilding {
  return { buildingId: "barn", datePlaced: 5, x: 10, y: 20, ...overrides };
}

const cursorOn = (x: number, y: number) => ({ x1: x, x2: x, y1: y, y2: y });

const eraseBuildings = (
  plannedBuildings: readonly IPlannedBuilding[],
  region: ReturnType<typeof cursorOn>,
  date: number,
) =>
  eraseEachBuilding(
    plannedBuildings,
    findBuildingsToErase(plannedBuildings, region, date),
    date,
  );

describe("plannableBuildingIds", () => {
  it("has the 23 buildings in buildings.json that the game can build, with no farmhouse or greenhouse", () => {
    expect(plannableBuildingIds).toHaveLength(23);
    expect(plannableBuildingIds.toSorted()).toEqual(
      Object.keys(buildings)
        .filter(
          (buildingId) => !["farmhouse", "greenhouse"].includes(buildingId),
        )
        .toSorted(),
    );
  });

  it.each([
    ["barn", true],
    ["pet_bowl", true],
    ["shipping_bin", true],
    ["farmhouse", false],
    ["greenhouse", false],
    ["toString", false],
    ["", false],
  ])("finds %s plannable: %s", (buildingId, isPlannable) => {
    expect(isPlannableBuilding(buildingId)).toBe(isPlannable);
  });

  it.each([
    ["barn", true],
    ["shed", true],
    ["big_barn", false],
    ["deluxe_coop", false],
    ["farmhouse", false],
    ["toString", false],
  ])(
    "finds that %s is the lowest tier of a building: %s",
    (buildingId, isGround) => {
      expect(isGroundBuilding(buildingId)).toBe(isGround);
    },
  );
});

describe("getFootprintTiles", () => {
  it("gives each tile of the size in buildings.json, row by row from the top-left", () => {
    expect(
      getFootprintTiles({ buildingId: "shipping_bin", x: 3, y: 4 }),
    ).toEqual([
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ]);
    expect(getFootprintTiles(barn())).toHaveLength(7 * 4);
    expect(getFootprintTiles(barn()).at(-1)).toEqual({ x: 16, y: 23 });
  });
});

describe("getBuildingsOn", () => {
  it("has a building from the date it goes down to the day before it is destroyed", () => {
    const destroyed = barn({ dateDestroyed: 9 });

    expect(
      [4, 5, 8, 9].map((date) => getBuildingsOn([destroyed], date).length),
    ).toEqual([0, 1, 1, 0]);
    expect(getBuildingsOn([barn()], 1000)).toEqual([barn()]);
  });

  it.each(["barn", "junimo_hut", "shipping_bin", "deluxe_barn"])(
    "places a whole %s on the date it goes down, with no build days",
    (buildingId) => {
      const plannedBuilding = buildingForRegion(
        buildingId,
        cursorOn(10, 20),
        5,
      );

      expect(
        [4, 5].map((date) =>
          getPlacedBuildingsOn([plannedBuilding], date).map(
            (placed) => placed.buildingId,
          ),
        ),
      ).toEqual([[], [buildingId]]);
    },
  );

  it("has a starter building on day 0", () => {
    const starterCoop: IPlannedBuilding = {
      buildingId: "coop",
      datePlaced: 0,
      starter: true,
      x: 54,
      y: 9,
    };

    expect(getBuildingsOn([starterCoop], 0)).toEqual([starterCoop]);
  });
});

describe("isOnPlannedBuilding", () => {
  it("finds a footprint tile while the building is there in the days", () => {
    const destroyed = barn({ dateDestroyed: 9 });

    expect(isOnPlannedBuilding([destroyed], 16, 23, { firstDay: 0 })).toBe(
      true,
    );
    expect(
      isOnPlannedBuilding([destroyed], 16, 23, { firstDay: 0, lastDay: 4 }),
    ).toBe(false);
    expect(isOnPlannedBuilding([destroyed], 16, 23, { firstDay: 9 })).toBe(
      false,
    );
    expect(isOnPlannedBuilding([destroyed], 17, 23, { firstDay: 0 })).toBe(
      false,
    );
  });
});

describe("getBuildingChangeDays", () => {
  it("gives each date of a building, an upgrade or a demolish one time, in order", () => {
    expect(
      getBuildingChangeDays([
        barn({ dateDestroyed: 30, datePlaced: 12 }),
        barn({
          datePlaced: 3,
          upgrades: [{ buildingId: "big_barn", datePlaced: 20 }],
        }),
        barn({ datePlaced: 30 }),
      ]),
    ).toEqual([3, 12, 20, 30]);
  });
});

describe("buildingForRegion", () => {
  it("puts the building down on the date, with its top-left on the tile under the cursor", () => {
    expect(
      buildingForRegion("coop", { x1: 4, x2: 9, y1: 6, y2: 9 }, 12),
    ).toEqual({ buildingId: "coop", datePlaced: 12, x: 4, y: 6 });
  });
});

describe("erasing buildings", () => {
  it("finds a building when the region touches any tile of its footprint on the date", () => {
    const building = barn();

    expect(findBuildingsToErase([building], cursorOn(16, 23), 5)).toEqual([
      building,
    ]);
    expect(
      findBuildingsToErase([building], { x1: 20, x2: 16, y1: 30, y2: 23 }, 5),
    ).toEqual([building]);
    expect(findBuildingsToErase([building], cursorOn(17, 23), 5)).toEqual([]);
    expect(findBuildingsToErase([building], cursorOn(10, 20), 4)).toEqual([]);
  });

  it("takes a building out of the plan when the erase is on its date", () => {
    const other = barn({ x: 30 });

    expect(eraseBuildings([barn(), other], cursorOn(12, 21), 5)).toEqual([
      other,
    ]);
    expect(getRemovedBuildings([barn()], 5)).toEqual([barn()]);
  });

  it.each([6, 8])(
    "demolishes a building from day %i, after its date",
    (date) => {
      expect(eraseBuildings([barn()], cursorOn(12, 21), date)).toEqual([
        barn({ dateDestroyed: date }),
      ]);
      expect(getRemovedBuildings([barn()], date)).toEqual([]);
    },
  );

  it("moves the demolish to an earlier date, and keeps a building that is gone on the date", () => {
    expect(
      eraseBuildings([barn({ dateDestroyed: 20 })], cursorOn(12, 21), 8),
    ).toEqual([barn({ dateDestroyed: 8 })]);
    expect(
      eraseBuildings([barn({ dateDestroyed: 8 })], cursorOn(12, 21), 10),
    ).toEqual([barn({ dateDestroyed: 8 })]);
  });

  it("does not change the buildings that the region does not touch", () => {
    const buildingsBefore = [barn()];
    const [kept] = eraseBuildings(buildingsBefore, cursorOn(0, 0), 8);

    expect(kept).toBe(buildingsBefore[0]);
  });
});

const upgradedBarn = barn({
  upgrades: [{ buildingId: "big_barn", datePlaced: 9 }],
});

describe("upgrades on the plan", () => {
  it("places the tier that stands on each date, from the date of its upgrade", () => {
    expect(
      [4, 5, 8, 9, 10].map((date) =>
        getPlacedBuildingsOn([upgradedBarn], date).map(
          ({ buildingId, isUpgrading }) => [buildingId, isUpgrading],
        ),
      ),
    ).toEqual([
      [],
      [["barn", undefined]],
      [["barn", undefined]],
      [["big_barn", undefined]],
      [["big_barn", undefined]],
    ]);
  });

  it("gives the tile rules and collision of each tier that stands on some of the days", () => {
    expect(
      getPlacedBuildingsOver([upgradedBarn], { firstDay: 8, lastDay: 9 }).map(
        ({ buildingId }) => buildingId,
      ),
    ).toEqual(["barn", "big_barn"]);
  });

  it("changes the tiles on the date of each upgrade", () => {
    expect(getBuildingChangeDays([upgradedBarn])).toEqual([5, 9]);
  });

  it("puts the lowest tier and the upgrades to the selected tier down on the same date on empty ground", () => {
    const chain = buildingForRegion("deluxe_coop", cursorOn(4, 6), 0);

    expect(chain).toEqual({
      buildingId: "coop",
      datePlaced: 0,
      upgrades: [
        { buildingId: "big_coop", datePlaced: 0 },
        { buildingId: "deluxe_coop", datePlaced: 0 },
      ],
      x: 4,
      y: 6,
    });
    expect(toPreviewBuilding(chain).buildingId).toBe("deluxe_coop");
    expect(
      getPlacedBuildingsOn([chain], 0).map(({ buildingId }) => buildingId),
    ).toEqual(["deluxe_coop"]);
  });
});

describe("skins on the plan", () => {
  const cabin: IPlannedBuilding = {
    buildingId: "cabin",
    datePlaced: 5,
    paints: [
      { datePainted: 8, skin: "plank_cabin" },
      { datePainted: 12, skin: "cabin" },
    ],
    skin: "log_cabin",
    x: 10,
    y: 20,
  };

  it("places the building with the skin that is active on each date, and no look key for the look with no skin", () => {
    expect(
      [5, 7, 8, 11, 12].map(
        (date) => getPlacedBuildingsOn([cabin], date)[0].lookKey,
      ),
    ).toEqual([
      "log_cabin",
      "log_cabin",
      "plank_cabin",
      "plank_cabin",
      undefined,
    ]);
    expect(getPlacedBuildingsOn([barn()], 20)[0]).not.toHaveProperty("lookKey");
  });

  it("previews a new building with its skin", () => {
    expect(toPreviewBuilding(cabin).lookKey).toBe("log_cabin");
    expect(toPreviewBuilding(barn())).not.toHaveProperty("lookKey");
  });
});

describe("getBuildingClick", () => {
  it("upgrades the building under the cursor when a higher tier is selected, also on its date", () => {
    expect(
      getBuildingClick([barn()], "big_barn", cursorOn(16, 23), 20),
    ).toEqual({
      target: barn(),
      type: "upgrade",
      upgraded: barn({
        upgrades: [{ buildingId: "big_barn", datePlaced: 20 }],
      }),
    });
    expect(getBuildingClick([barn()], "big_barn", cursorOn(10, 20), 5)).toEqual(
      {
        target: barn(),
        type: "upgrade",
        upgraded: barn({
          upgrades: [{ buildingId: "big_barn", datePlaced: 5 }],
        }),
      },
    );
  });

  it("gives no upgraded building when the building under the cursor cannot take the tier", () => {
    expect(getBuildingClick([barn()], "big_coop", cursorOn(10, 20), 6)).toEqual(
      { target: barn(), type: "upgrade" },
    );
  });

  it("puts a new building down when the cursor is not on a building of the date", () => {
    expect(
      getBuildingClick([barn()], "big_barn", cursorOn(30, 20), 20),
    ).toEqual({
      plannedBuilding: buildingForRegion("big_barn", cursorOn(30, 20), 20),
      type: "new",
    });
    expect(
      getBuildingClick([barn()], "big_barn", cursorOn(10, 20), 4).type,
    ).toBe("new");
  });

  it("puts a new building down for the lowest tier, also on a building", () => {
    expect(getBuildingClick([barn()], "barn", cursorOn(10, 20), 20).type).toBe(
      "new",
    );
  });

  it("puts the upgraded building in the place of the old one", () => {
    const other = barn({ x: 30 });
    const target = barn();

    expect(replaceBuilding([other, target], target, upgradedBarn)).toEqual([
      other,
      upgradedBarn,
    ]);
  });
});

describe("erasing buildings with upgrades", () => {
  it("takes back the upgrade on its date and keeps the lower tier", () => {
    expect(eraseBuildings([upgradedBarn], cursorOn(12, 21), 9)).toEqual([
      barn(),
    ]);
    expect(getRemovedBuildings([upgradedBarn], 9)).toEqual([]);
  });

  it("takes the whole building out of the plan on its date", () => {
    expect(eraseBuildings([upgradedBarn], cursorOn(12, 21), 5)).toEqual([]);
  });

  it("demolishes the tier on the date and drops the upgrades planned after it", () => {
    expect(eraseBuildings([upgradedBarn], cursorOn(12, 21), 7)).toEqual([
      barn({ dateDestroyed: 7 }),
    ]);
    expect(eraseBuildings([upgradedBarn], cursorOn(12, 21), 20)).toEqual([
      { ...upgradedBarn, dateDestroyed: 20 },
    ]);
  });
});
