import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { decodeFarmMap } from "./farmMap";
import type { ICurrentItems } from "./itemPlacement";
import { planRegionErase } from "./regionErase";

// The medium bush covers 20, 40 and 21, 40.
const medium: IFarmBush = { destroyable: true, size: "medium", x: 20, y: 40 };

const file = makeTestFarmMapFile();
file.farm.bushes = [medium];
const farmMap = decodeFarmMap("bushes", file);

const region = { x1: 19, x2: 22, y1: 40, y2: 40 };

function parsnip(x: number, datePlanted: number): IPlantedCrop {
  return { cropId: "parsnip", datePlanted, type: "crop", x, y: 40 };
}

function chest(x: number, dateInstalled: number): IInstalledEquipment {
  return {
    dateInstalled,
    equipmentId: "chest",
    skin: "chest",
    type: "equipment",
    x,
    y: 40,
  };
}

function planWith(more: Partial<ICurrentItems>): ICurrentItems {
  return {
    currentBuildings: [],
    currentCrops: {},
    currentCutBushes: [],
    currentEquipment: {},
    ...more,
  };
}

describe("planRegionErase", () => {
  it("leaves the plan that it reads as it is, because the preview runs it for each frame", () => {
    const crop = parsnip(19, 0);
    const item = chest(22, 0);
    const plan = planWith({
      currentCrops: { 40: { 19: [crop] } },
      currentEquipment: { 40: { 22: [item] } },
    });

    const erase = planRegionErase(plan, farmMap, region, 3);

    expect(erase.crops[40][19]).toEqual([{ ...crop, dateDestroyed: 3 }]);
    expect(erase.equipment[40][22]).toEqual([{ ...item, dateDestroyed: 3 }]);
    expect(plan.currentCrops).toEqual({ 40: { 19: [parsnip(19, 0)] } });
    expect(plan.currentEquipment).toEqual({ 40: { 22: [chest(22, 0)] } });
  });

  it("gives a bush back on the date of its cut when the same erase takes the crop off its tile", () => {
    const plan = planWith({
      currentCrops: { 40: { 21: [parsnip(21, 5)] } },
      currentCutBushes: [{ dateCut: 5, x: 20, y: 40 }],
    });

    expect(planRegionErase(plan, farmMap, region, 5).bushes).toEqual({
      backTiles: [
        { x: 20, y: 40 },
        { x: 21, y: 40 },
      ],
      cutBushes: [],
      cutTiles: [],
    });
  });
});
