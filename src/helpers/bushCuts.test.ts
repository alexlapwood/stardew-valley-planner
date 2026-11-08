import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { planBushErase } from "./bushCuts";
import { decodeFarmMap } from "./farmMap";
import type { ICurrentItems } from "./itemPlacement";

// The medium bush covers 20, 40 and 21, 40, and the large bush 30, 40 to
// 32, 40.
const medium: IFarmBush = { destroyable: true, size: "medium", x: 20, y: 40 };
const large: IFarmBush = { destroyable: true, size: "large", x: 30, y: 40 };
const fixedBush: IFarmBush = {
  destroyable: false,
  size: "small",
  x: 25,
  y: 40,
};

const file = makeTestFarmMapFile();
file.farm.bushes = [medium, large, fixedBush];
const farmMap = decodeFarmMap("bushes", file);

const cutOf = ({ x, y }: IFarmTile, dateCut: number): ICutBush => ({
  dateCut,
  x,
  y,
});

const at = (x: number, y = 40) => ({ x1: x, x2: x, y1: y, y2: y });

function planWith(
  cutBushes: ICutBush[],
  more: Partial<ICurrentItems> = {},
): ICurrentItems {
  return {
    currentBuildings: [],
    currentCrops: {},
    currentCutBushes: cutBushes,
    currentEquipment: {},
    ...more,
  };
}

describe("planBushErase", () => {
  it("cuts a destroyable bush from the date that shows, and shows all of its tiles", () => {
    expect(planBushErase(farmMap, planWith([]), at(21), 10)).toEqual({
      backTiles: [],
      cutBushes: [cutOf(medium, 10)],
      cutTiles: [
        { x: 20, y: 40 },
        { x: 21, y: 40 },
      ],
    });
  });

  it("does nothing, and says nothing, to a bush that the game cannot cut", () => {
    const before: ICutBush[] = [];
    const erase = planBushErase(farmMap, planWith(before), at(25), 10);

    expect(erase).toEqual({ backTiles: [], cutBushes: [], cutTiles: [] });
    expect(erase.cutBushes).toBe(before);
  });

  it("cuts each destroyable bush that a drag covers, and leaves the others", () => {
    const erase = planBushErase(
      farmMap,
      planWith([]),
      { x1: 19, x2: 30, y1: 39, y2: 40 },
      10,
    );

    expect(erase.cutBushes).toEqual([cutOf(medium, 10), cutOf(large, 10)]);
    expect(erase.cutTiles).toHaveLength(5);
  });

  it("gives a bush back with a right-click on the date of its cut", () => {
    const erase = planBushErase(
      farmMap,
      planWith([cutOf(medium, 10), cutOf(large, 4)]),
      at(20),
      10,
    );

    expect(erase).toEqual({
      backTiles: [
        { x: 20, y: 40 },
        { x: 21, y: 40 },
      ],
      cutBushes: [cutOf(large, 4)],
      cutTiles: [],
    });
  });

  it("gives a bush back only until the next thing on its tiles starts", () => {
    const parsnip: IPlantedCrop = {
      cropId: "parsnip",
      datePlanted: 15,
      type: "crop",
      x: 21,
      y: 40,
    };
    const plan = planWith([cutOf(medium, 10)], {
      currentCrops: { 40: { 21: [parsnip] } },
    });

    expect(planBushErase(farmMap, plan, at(20), 10).cutBushes).toEqual([
      cutOf(medium, 15),
    ]);
  });

  it("does not give a bush back while a thing starts on its tiles on the date of the cut", () => {
    const barn: IPlannedBuilding = {
      buildingId: "barn",
      datePlaced: 10,
      x: 20,
      y: 37,
    };
    const before = [cutOf(medium, 10)];
    const erase = planBushErase(
      farmMap,
      planWith(before, { currentBuildings: [barn] }),
      at(21),
      10,
    );

    expect(erase.cutBushes).toBe(before);
    expect(erase.backTiles).toEqual([]);
  });

  it("gives a bush back only until a building with the tile below its door on the bush goes down", () => {
    // A barn at 20, 36 has the tile below its door at 21, 40.
    const barn: IPlannedBuilding = {
      buildingId: "barn",
      datePlaced: 15,
      x: 20,
      y: 36,
    };
    const plan = planWith([cutOf(medium, 10)], { currentBuildings: [barn] });

    expect(planBushErase(farmMap, plan, at(20), 10)).toEqual({
      backTiles: [
        { x: 20, y: 40 },
        { x: 21, y: 40 },
      ],
      cutBushes: [cutOf(medium, 15)],
      cutTiles: [],
    });
  });

  it("does not give a bush back while a building with the tile below its door on the bush goes down on the date of the cut", () => {
    const barn: IPlannedBuilding = {
      buildingId: "barn",
      datePlaced: 10,
      x: 20,
      y: 36,
    };
    const before = [cutOf(medium, 10)];
    const erase = planBushErase(
      farmMap,
      planWith(before, { currentBuildings: [barn] }),
      at(20),
      10,
    );

    expect(erase.cutBushes).toBe(before);
    expect(erase.backTiles).toEqual([]);
  });

  it("moves the cut to an earlier date that shows, and leaves a bush that is cut before the date", () => {
    expect(
      planBushErase(farmMap, planWith([cutOf(medium, 10)]), at(21), 6)
        .cutBushes,
    ).toEqual([cutOf(medium, 6)]);
    expect(
      planBushErase(farmMap, planWith([cutOf(medium, 10)]), at(21), 12),
    ).toEqual({
      backTiles: [],
      cutBushes: [cutOf(medium, 10)],
      cutTiles: [],
    });
  });

  it("does not touch a bush when the region covers only the rows that its sprite covers", () => {
    expect(planBushErase(farmMap, planWith([]), at(21, 39), 10)).toEqual({
      backTiles: [],
      cutBushes: [],
      cutTiles: [],
    });
  });
});
