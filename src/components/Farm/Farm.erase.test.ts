import { makeTestFarmMapFile } from "../../__mocks__/testFarmMap";
import { decodeFarmMap } from "../../helpers/farmMap";
import type { ICurrentItems } from "../../helpers/itemPlacement";
import { planRegionErase } from "../../helpers/regionErase";
import {
  buildings,
  crops,
  cutBushes,
  equipment,
  setBuildings,
  setCrops,
  setCutBushes,
  setEquipment,
} from "../../state/farm";
import { pickAxe } from "./Farm.drag";
import { eraseRegion } from "./Farm.erase";
import { getPlanNotice } from "./Farm.preview";

// The medium bush covers 10, 20 and 11, 20.
const medium: IFarmBush = { destroyable: true, size: "medium", x: 10, y: 20 };
const fixedSmall: IFarmBush = {
  destroyable: false,
  size: "small",
  x: 15,
  y: 20,
};

const file = makeTestFarmMapFile();
file.farm.bushes = [medium, fixedSmall];
const farmMap = decodeFarmMap("bushes", file);

function parsnip(x: number, y: number, datePlanted: number): IPlantedCrop {
  return { cropId: "parsnip", datePlanted, type: "crop", x, y };
}

function currentItems(): ICurrentItems {
  return {
    currentBuildings: buildings(),
    currentCrops: crops(),
    currentCutBushes: cutBushes(),
    currentEquipment: equipment(),
  };
}

const region = (x1: number, x2: number, y1: number, y2: number) => ({
  x1,
  x2,
  y1,
  y2,
});

function erase(highlightedRegion: ReturnType<typeof region>, date: number) {
  eraseRegion(highlightedRegion, { date, farmMap }, currentItems());
}

beforeEach(() => {
  setBuildings([]);
  setCrops({});
  setCutBushes([]);
  setEquipment({});
});

describe("eraseRegion with the bushes of the farm map", () => {
  it("cuts a destroyable bush and erases the crops of the same drag in one action", () => {
    setCrops({ 18: { 9: [parsnip(9, 18, 9)] } });

    erase(region(9, 10, 18, 20), 10);

    expect(cutBushes()).toEqual([{ dateCut: 10, x: 10, y: 20 }]);
    expect(crops()[18][9][0].dateDestroyed).toBe(10);
  });

  it("gives the bush back with an erase on the date of its cut, and erases the crop planted there on that date", () => {
    setCutBushes([{ dateCut: 10, x: 10, y: 20 }]);
    setCrops({ 20: { 11: [parsnip(11, 20, 10)] } });

    erase(region(11, 11, 20, 20), 10);

    expect(cutBushes()).toEqual([]);
    expect(crops()[20][11][0].dateDestroyed).toBe(10);
  });

  it("moves a later cut to the earlier date of the erase, and shows it as a cut", () => {
    const summer1 = 28;
    const spring5 = 4;
    const highlightedRegion = region(11, 11, 20, 20);
    setCutBushes([{ dateCut: summer1, x: 10, y: 20 }]);

    expect(
      planRegionErase(currentItems(), farmMap, highlightedRegion, spring5)
        .bushes,
    ).toEqual({
      backTiles: [],
      cutBushes: [{ dateCut: spring5, x: 10, y: 20 }],
      cutTiles: [
        { x: 10, y: 20 },
        { x: 11, y: 20 },
      ],
    });

    erase(highlightedRegion, spring5);

    expect(cutBushes()).toEqual([{ dateCut: spring5, x: 10, y: 20 }]);
  });

  it("leaves a bush that the game cannot cut, and shows no notice for it", () => {
    const before = cutBushes();
    const highlightedRegion = region(15, 15, 20, 20);

    erase(highlightedRegion, 10);

    expect(cutBushes()).toBe(before);
    expect(
      getPlanNotice({
        currentItems: currentItems(),
        date: 10,
        farmMap,
        highlightedRegion,
        selectedItem: pickAxe,
      }),
    ).toBeUndefined();
  });
});
