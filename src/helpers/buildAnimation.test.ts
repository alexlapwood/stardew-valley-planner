import {
  getBuildLength,
  getBuildMoment,
  getBuildNextChange,
  getBuildsNextChange,
  getHouseBuild,
  getNewBuildingBuild,
  getUpgradeBuild,
  type IBuild,
  type IBuildAnimation,
  isBuildOn,
  isBuildOver,
} from "./buildAnimation";
import { buildingForRegion } from "./plannedBuildings";

const swing = 750;

const cursorOn = (x: number, y: number) => ({ x1: x, x2: x, y1: y, y2: y });

const putDown = (buildingId: string, date = 5) =>
  buildingForRegion(buildingId, cursorOn(10, 20), date);

function animate(build: IBuild | undefined, start = 1000): IBuildAnimation {
  if (build === undefined) {
    throw new Error("The click built nothing to animate.");
  }

  return { ...build, date: 5, start };
}

describe("the stages of a new building", () => {
  it("has the site, then the site on its last day, for a building with a site", () => {
    expect(getNewBuildingBuild(putDown("barn"))?.stages).toEqual([
      { buildingId: "barn", isLastDay: false, type: "site" },
      { buildingId: "barn", isLastDay: true, type: "site" },
    ]);
  });

  it("adds each upgrade of a chain on grass, in order, with the lower tier", () => {
    expect(getNewBuildingBuild(putDown("deluxe_barn"))?.stages).toEqual([
      { buildingId: "barn", isLastDay: false, type: "site" },
      { buildingId: "barn", isLastDay: true, type: "site" },
      { fromId: "barn", type: "upgrade" },
      { fromId: "big_barn", type: "upgrade" },
    ]);
  });

  it.each(["junimo_hut", "cabin", "shipping_bin", "pet_bowl", "gold_clock"])(
    "has no animation for a %s, which has no site",
    (buildingId) => {
      expect(getNewBuildingBuild(putDown(buildingId))).toBeUndefined();
    },
  );

  it.each([
    "barn",
    "coop",
    "shed",
    "fish_pond",
    "mill",
    "silo",
    "slime_hutch",
    "stable",
    "well",
  ])("animates a %s, which has a site", (buildingId) => {
    expect(getNewBuildingBuild(putDown(buildingId))?.stages).toHaveLength(2);
  });

  it("is made for the building that the click put down", () => {
    const barn = putDown("barn");

    expect(getNewBuildingBuild(barn)?.target).toEqual({
      plannedBuilding: barn,
      type: "building",
    });
  });
});

describe("the stages of an upgrade", () => {
  const barn = putDown("barn", 0);

  it("has the lower tier with the sign for each new tier, in order", () => {
    const upgraded: IPlannedBuilding = {
      ...barn,
      upgrades: [
        { buildingId: "big_barn", datePlaced: 5 },
        { buildingId: "deluxe_barn", datePlaced: 5 },
      ],
    };

    expect(getUpgradeBuild(barn, upgraded, 5)).toEqual({
      stages: [
        { fromId: "barn", type: "upgrade" },
        { fromId: "big_barn", type: "upgrade" },
      ],
      target: { plannedBuilding: upgraded, type: "building" },
    });
  });

  it("has only the tiers that the click added", () => {
    const bigBarn: IPlannedBuilding = {
      ...barn,
      upgrades: [{ buildingId: "big_barn", datePlaced: 5 }],
    };
    const deluxeBarn: IPlannedBuilding = {
      ...barn,
      upgrades: [
        { buildingId: "big_barn", datePlaced: 5 },
        { buildingId: "deluxe_barn", datePlaced: 5 },
      ],
    };

    expect(getUpgradeBuild(bigBarn, deluxeBarn, 5)?.stages).toEqual([
      { fromId: "big_barn", type: "upgrade" },
    ]);
  });
});

describe("the stages of a house upgrade", () => {
  it("has the house of each level before the new one, with Robin at the wall", () => {
    const kitchen = [{ datePlaced: 2, level: 1 }];
    const cellar = [
      ...kitchen,
      { datePlaced: 5, level: 2 },
      { datePlaced: 5, level: 3 },
    ];

    expect(getHouseBuild(kitchen, cellar, 5)).toEqual({
      stages: [
        { level: 1, type: "house" },
        { level: 2, type: "house" },
      ],
      target: { houseUpgrades: cellar, type: "house" },
    });
    expect(getHouseBuild(cellar, cellar, 5)).toBeUndefined();
  });
});

describe("the timing", () => {
  const animation = animate(getNewBuildingBuild(putDown("deluxe_barn")));

  it("gives each stage 1 swing of Robin's hammer", () => {
    expect(getBuildLength(animation)).toBe(4 * swing);
  });

  it.each([
    [0, "site", 24],
    [1000, "site", 24],
    [1000 + 74, "site", 24],
    [1000 + 75, "site", 25],
    [1000 + 150, "site", 26],
    [1000 + 450, "site", 27],
    [1000 + swing, "lastDay", 24],
    [1000 + swing + 450, "lastDay", 27],
    [1000 + 2 * swing, "barn", undefined],
    [1000 + 3 * swing + 749, "big_barn", undefined],
  ])(
    "at %d ms shows the stage %s with Robin's frame %s",
    (time, stage, frame) => {
      const moment = getBuildMoment(animation, time);
      const stageName =
        moment?.stage.type === "site"
          ? moment.stage.isLastDay
            ? "lastDay"
            : "site"
          : moment?.stage.type === "upgrade"
            ? moment.stage.fromId
            : undefined;

      expect(stageName).toBe(stage);
      expect(moment?.robinFrame).toBe(frame);
    },
  );

  it("starts on frame 24 with no long pause, and ends after the last swing", () => {
    expect(getBuildMoment(animation, 1000 + 4 * swing)).toBeUndefined();
    expect(isBuildOver(animation, 1000 + 4 * swing - 1)).toBe(false);
    expect(isBuildOver(animation, 1000 + 4 * swing)).toBe(true);
  });

  it("changes at each frame of Robin's swing, and at the end", () => {
    const nextChange = getBuildNextChange(animation);

    expect(
      [0, 1000, 1075, 1150, 1450, 1000 + swing, 1000 + 4 * swing - 1].map(
        nextChange,
      ),
    ).toEqual([1075, 1075, 1150, 1450, 1750, 1000 + swing + 75, 4000]);
    expect(nextChange(1000 + 4 * swing)).toBe(Infinity);
  });

  it("changes only at the end of an upgrade stage, which has no Robin", () => {
    const nextChange = getBuildNextChange(animation);

    expect(nextChange(1000 + 2 * swing)).toBe(1000 + 3 * swing);
    expect(nextChange(1000 + 2 * swing + 80)).toBe(1000 + 3 * swing);
  });

  it("wakes at the earliest change of all the animations, and never with none", () => {
    const later = animate(getNewBuildingBuild(putDown("coop")), 1100);

    expect(getBuildsNextChange([animation, later])(1100)).toBe(1150);
    expect(getBuildsNextChange([])(0)).toBe(Infinity);
  });
});

describe("isBuildOn", () => {
  const barn = putDown("barn");
  const animation = animate(getNewBuildingBuild(barn));
  const houseUpgrades = [{ datePlaced: 5, level: 1 }];
  const plan = { buildings: [barn], date: 5, houseUpgrades };

  it("plays while its building is on the plan on the date", () => {
    expect(isBuildOn(animation, plan)).toBe(true);
  });

  it("stops when the building is erased or changed, or the date changes", () => {
    expect(isBuildOn(animation, { ...plan, buildings: [] })).toBe(false);
    expect(
      isBuildOn(animation, { ...plan, buildings: [{ ...barn, skin: "barn" }] }),
    ).toBe(false);
    expect(isBuildOn(animation, { ...plan, date: 6 })).toBe(false);
  });

  it("plays a house upgrade while its upgrades are on the plan", () => {
    const house = animate(getHouseBuild([], houseUpgrades, 5));

    expect(isBuildOn(house, plan)).toBe(true);
    expect(isBuildOn(house, { ...plan, houseUpgrades: [] })).toBe(false);
  });
});
