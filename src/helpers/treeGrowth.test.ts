import { testFarmMap } from "../__mocks__/testFarmMap";
import { getGrowthBlockersOn, getTreeSchedule } from "./treeGrowth";

const winter = 84;

function tree(
  treeId: string,
  x: number,
  y: number,
  overrides: Partial<IPlantedTree> = {},
): IPlantedTree {
  return { datePlanted: 0, treeId, type: "tree", x, y, ...overrides };
}

function equipment(
  equipmentId: string,
  skin: string,
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId,
    skin,
    type: "equipment",
    x,
    y,
    ...overrides,
  };
}

const scarecrow = (
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
) => equipment("scarecrow", "scarecrow", x, y, overrides);

function parsnip(x: number, y: number, datePlanted: number): IPlantedCrop {
  return { cropId: "parsnip", datePlanted, type: "crop", x, y };
}

function addByTile<T extends TFarmItem>(farmItems: IFarmItems<T[]>, item: T) {
  farmItems[item.y] = { ...farmItems[item.y], [item.x]: [item] };
}

function planWith(farmItems: readonly TFarmItem[]) {
  const currentCrops: IFarmCrops = {};
  const currentEquipment: IFarmEquipment = {};

  farmItems.forEach((farmItem) => {
    if (farmItem.type === "equipment") {
      addByTile(currentEquipment, farmItem);
    } else {
      addByTile(currentCrops, farmItem);
    }
  });

  return { currentCrops, currentEquipment, farmMap: testFarmMap };
}

const apple = tree("apple", 10, 10);

function scheduleOf(plantedTree: IPlantedTree, things: TFarmItem[] = []) {
  return getTreeSchedule(planWith([plantedTree, ...things]), plantedTree);
}

describe("getTreeSchedule", () => {
  it("matures a fruit tree after its days to mature, with a stage each 7 days", () => {
    expect(scheduleOf(apple)).toEqual({
      matureDate: 28,
      stageDates: [0, 7, 14, 21],
    });
  });

  it("does not count a day with a blocker beside the tree", () => {
    expect(
      scheduleOf(apple, [scarecrow(11, 10, { dateDestroyed: 5 })]),
    ).toEqual({ matureDate: 33, stageDates: [0, 12, 19, 26] });
  });

  it("stops the growth for good while a blocker stays", () => {
    expect(scheduleOf(apple, [scarecrow(9, 9)])).toEqual({
      matureDate: undefined,
      stageDates: [0, undefined, undefined, undefined],
    });
  });

  it.each<[string, TFarmItem]>([
    ["a floor", equipment("flooring", "wood_floor", 10, 11)],
    ["a fence", equipment("fence", "wood_fence", 11, 11)],
    ["a sprinkler", equipment("sprinkler", "quality_sprinkler", 9, 10)],
    ["a big craftable", equipment("keg", "keg", 10, 9)],
    ["a tea bush", tree("tea_bush", 11, 9)],
    ["a fruit tree", tree("cherry", 9, 9)],
  ])("is blocked by %s beside it", (_, thing) => {
    expect(scheduleOf(apple, [thing]).matureDate).toBeUndefined();
  });

  it("is blocked by a crop beside it only while the crop grows", () => {
    expect(scheduleOf(apple, [parsnip(9, 11, 0)]).matureDate).toBe(28 + 4);
    expect(scheduleOf(apple, [parsnip(11, 10, 3)]).matureDate).toBe(28 + 4);
  });

  it("is not blocked by a thing 2 tiles away", () => {
    expect(scheduleOf(apple, [scarecrow(12, 10), scarecrow(8, 8)])).toEqual({
      matureDate: 28,
      stageDates: [0, 7, 14, 21],
    });
  });

  it("is not blocked by a thing put down after the tree is mature", () => {
    expect(
      scheduleOf(apple, [scarecrow(11, 10, { dateInstalled: 28 })]),
    ).toEqual({ matureDate: 28, stageDates: [0, 7, 14, 21] });
  });

  it("is not blocked by a thing that is destroyed on the day it is put down", () => {
    expect(
      scheduleOf(apple, [
        scarecrow(11, 10, { dateDestroyed: 5, dateInstalled: 5 }),
      ]).matureDate,
    ).toBe(28);
  });

  it("counts the days once where blockers overlap or follow each other", () => {
    expect(
      scheduleOf(apple, [
        scarecrow(11, 10, { dateDestroyed: 5 }),
        scarecrow(9, 10, { dateDestroyed: 10, dateInstalled: 3 }),
        parsnip(10, 11, 10),
      ]).matureDate,
    ).toBe(28 + 14);
  });

  it("is blocked for good beside a fixed building", () => {
    const besideGreenhouse = tree("apple", 24, 10);

    expect(scheduleOf(besideGreenhouse).matureDate).toBeUndefined();
  });

  it("is blocked by a planned building beside it only while the building is there", () => {
    const shippingBin: IPlannedBuilding = {
      buildingId: "shipping_bin",
      dateDestroyed: 10,
      datePlaced: 3,
      x: 11,
      y: 11,
    };
    const plan = { ...planWith([apple]), currentBuildings: [shippingBin] };

    expect(getTreeSchedule(plan, apple).matureDate).toBe(28 + 7);
    expect(getGrowthBlockersOn(plan, apple, 3)).toEqual([{ x: 11, y: 11 }]);
    expect(getGrowthBlockersOn(plan, apple, 10)).toEqual([]);
  });

  it("is blocked for good by a planned building that stays", () => {
    const silo: IPlannedBuilding = {
      buildingId: "silo",
      datePlaced: 14,
      x: 7,
      y: 9,
    };
    const plan = { ...planWith([apple]), currentBuildings: [silo] };

    expect(getTreeSchedule(plan, apple)).toEqual({
      matureDate: undefined,
      stageDates: [0, 7, 14, undefined],
    });
  });

  it("grows a fruit tree in winter", () => {
    const winterApple = tree("apple", 10, 10, { datePlanted: winter });

    expect(scheduleOf(winterApple)).toEqual({
      matureDate: winter + 28,
      stageDates: [winter, winter + 7, winter + 14, winter + 21],
    });
  });

  it("ages a tea bush every day, also with blockers beside it", () => {
    const teaBush = tree("tea_bush", 10, 10, { datePlanted: winter });
    const blockers = [scarecrow(11, 10), parsnip(9, 10, 0)];

    expect(scheduleOf(teaBush, blockers)).toEqual({
      matureDate: winter + 20,
      stageDates: [winter, winter + 10],
    });
  });

  it("gives the same schedule until the plan changes", () => {
    const plan = planWith([apple]);
    const schedule = getTreeSchedule(plan, apple);

    expect(getTreeSchedule({ ...plan }, apple)).toBe(schedule);

    const changedPlan = planWith([apple, scarecrow(11, 10)]);

    expect(getTreeSchedule(changedPlan, apple)).not.toBe(schedule);
    expect(getTreeSchedule(changedPlan, apple).matureDate).toBeUndefined();
  });

  it("gives a new schedule when the buildings change", () => {
    const plan = { ...planWith([apple]), currentBuildings: [] };
    const schedule = getTreeSchedule(plan, apple);
    const withSilo = {
      ...plan,
      currentBuildings: [{ buildingId: "silo", datePlaced: 0, x: 7, y: 9 }],
    };

    expect(getTreeSchedule(withSilo, apple)).not.toBe(schedule);
    expect(getTreeSchedule(withSilo, apple).matureDate).toBeUndefined();
  });
});

describe("getGrowthBlockersOn", () => {
  it("gives each tile beside the tree with a blocker on the day, one time", () => {
    const plan = planWith([
      apple,
      scarecrow(11, 10),
      parsnip(11, 10, 0),
      parsnip(9, 9, 20),
      scarecrow(12, 12),
    ]);

    expect(getGrowthBlockersOn(plan, apple, 0)).toEqual([{ x: 11, y: 10 }]);
    expect(getGrowthBlockersOn(plan, apple, 20)).toEqual([
      { x: 9, y: 9 },
      { x: 11, y: 10 },
    ]);
  });

  it("gives the fixed building tiles beside the tree", () => {
    const besideGreenhouse = tree("apple", 24, 10);

    expect(getGrowthBlockersOn(planWith([]), besideGreenhouse, 0)).toEqual([
      { x: 25, y: 10 },
      { x: 25, y: 11 },
    ]);
  });

  it("gives no blockers for a tea bush", () => {
    const teaBush = tree("tea_bush", 10, 10);
    const plan = planWith([scarecrow(11, 10)]);

    expect(getGrowthBlockersOn(plan, teaBush, 0)).toEqual([]);
  });
});
