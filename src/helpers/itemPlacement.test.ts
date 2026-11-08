import { testFarmMap } from "../__mocks__/testFarmMap";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  destroyCrops,
  findCropToDestroy,
  findEquipmentToDestroy,
} from "./itemPlacement";

const appleTree: IPlantedTree = {
  datePlanted: 10,
  treeId: "apple",
  type: "tree",
  x: 0,
  y: 0,
};

function parsnipOn(datePlanted: number): IPlantedCrop {
  return { cropId: "parsnip", datePlanted, type: "crop", x: 0, y: 0 };
}

function scarecrowOn(dateInstalled: number): IInstalledEquipment {
  return {
    dateInstalled,
    equipmentId: "scarecrow",
    skin: "scarecrow",
    type: "equipment",
    x: 0,
    y: 0,
  };
}

describe("items on a tree tile", () => {
  const currentCrops: IFarmCrops = { 0: { 0: [appleTree] } };

  it("does not plant a crop while the tree is there, or that grows into the planting day", () => {
    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      [parsnipOn(0), parsnipOn(7), parsnipOn(10), parsnipOn(112)],
      { currentCrops, currentEquipment: {} },
      testFarmMap,
    );

    expect(plantableCrops).toEqual([parsnipOn(0)]);
    expect(unplantableCrops).toEqual([
      parsnipOn(7),
      parsnipOn(10),
      parsnipOn(112),
    ]);
  });

  it("installs equipment only before the tree, and removes it on the planting day", () => {
    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        [scarecrowOn(0), scarecrowOn(10), scarecrowOn(112)],
        { currentCrops, currentEquipment: {} },
        testFarmMap,
      );

    expect(installableEquipment).toEqual([
      { ...scarecrowOn(0), dateDestroyed: 10 },
    ]);
    expect(notInstallableEquipment).toEqual([
      scarecrowOn(10),
      scarecrowOn(112),
    ]);
  });

  it("finds and destroys the tree from its planting day, with no last day", () => {
    expect(findCropToDestroy([appleTree], 9)).toBeUndefined();
    expect(findCropToDestroy([appleTree], 500)).toBe(appleTree);
    expect(destroyCrops([{ ...appleTree }], 500)).toEqual([
      { ...appleTree, dateDestroyed: 500 },
    ]);
  });

  it("does not destroy a tree again after it is destroyed", () => {
    const destroyedTree = { ...appleTree, dateDestroyed: 20 };

    expect(findCropToDestroy([destroyedTree], 20)).toBeUndefined();
    expect(destroyCrops([{ ...destroyedTree }], 30)).toEqual([destroyedTree]);
  });
});

function melonOn(datePlanted: number): IPlantedCrop {
  return { ...parsnipOn(datePlanted), cropId: "melon" };
}

function woodFloorOn(dateInstalled: number): IInstalledEquipment {
  return {
    ...scarecrowOn(dateInstalled),
    equipmentId: "flooring",
    skin: "wood_floor",
  };
}

describe("items on a planned building tile", () => {
  const currentBuildings: IPlannedBuilding[] = [
    { buildingId: "barn", dateDestroyed: 30, datePlaced: 10, x: 0, y: 0 },
  ];

  it("does not plant a crop that is still there on any day of the building", () => {
    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      [parsnipOn(0), parsnipOn(7), parsnipOn(12), melonOn(29), melonOn(30)],
      { currentBuildings, currentCrops: {}, currentEquipment: {} },
      testFarmMap,
    );

    expect(plantableCrops).toEqual([parsnipOn(0), melonOn(30)]);
    expect(unplantableCrops).toEqual([
      parsnipOn(7),
      parsnipOn(12),
      melonOn(29),
    ]);
  });

  it("does not install a thing that stays into the building days, but puts a floor under the building", () => {
    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        [scarecrowOn(0), scarecrowOn(12), scarecrowOn(30), woodFloorOn(0)],
        { currentBuildings, currentCrops: {}, currentEquipment: {} },
        testFarmMap,
      );

    expect(installableEquipment).toEqual([scarecrowOn(30), woodFloorOn(0)]);
    expect(notInstallableEquipment).toEqual([scarecrowOn(0), scarecrowOn(12)]);
  });

  it("installs a thing that a later crop takes away before the building comes", () => {
    const { installableEquipment } = checkEquipmentToInstall(
      [scarecrowOn(0)],
      {
        currentBuildings,
        currentCrops: { 0: { 0: [parsnipOn(3)] } },
        currentEquipment: {},
      },
      testFarmMap,
    );

    expect(installableEquipment).toEqual([
      { ...scarecrowOn(0), dateDestroyed: 3 },
    ]);
  });
});

describe("checkCropsToPlant", () => {
  it("can detect overlapping crops", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 2, y: 0 },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(1);
  });

  it("can detect crops that are still growing here", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });

  it("can detect crops that were planted after today", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });

  it("doesn't detect crops that were destroyed on the day they were created", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [
          {
            cropId: "parsnip",
            dateDestroyed: 5,
            datePlanted: 5,
            type: "crop",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(6);
    expect(unplantableCrops).toHaveLength(0);
  });

  it("can detect overlapping equipment", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 2, y: 0 },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(0);
    expect(unplantableCrops).toHaveLength(3);
  });

  it("can detect equipment that will be installed in the future", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 5,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarmMap,
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });
});

describe("checkEquipmentToInstall", () => {
  it("can detect overlapping crops", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 1,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 2,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect crops that are still growing here", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(4);
  });

  it("can install equipment before crops are planted", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }],
      },
    };

    const currentEquipment: IFarmEquipment = {};

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect overlapping equipment", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 1,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 2,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 999,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(0);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can install equipment before other equipment is installed", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 5,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect overlapping flooring", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 1,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 2,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "flooring",
            skin: "wood_floor",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("does not detect overlapping flooring and equipment", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 0,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 1,
        y: 0,
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skin: "wood_floor",
        type: "equipment",
        x: 2,
        y: 0,
      },
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skin: "scarecrow",
            type: "equipment",
            x: 0,
            y: 0,
          },
        ],
      },
    };

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstall,
        {
          currentCrops,
          currentEquipment,
        },
        testFarmMap,
      );

    expect(installableEquipment).toHaveLength(3);
    expect(notInstallableEquipment).toHaveLength(0);
  });
});

describe("findCropToDestroy", () => {
  it("can find crops planted today", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("can find crops on their last day", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 3);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("does not include crops that haven't been planted yet", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeFalsy();
  });

  it("does not include crops that have died", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 4);

    expect(hasCropToDestroy).toBeFalsy();
  });
});

describe("findEquipmentToDestroy", () => {
  it("can find equipment installed today", () => {
    const installedEquipment: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const hasEquipmentToDestroy = findEquipmentToDestroy(installedEquipment, 0);

    expect(hasEquipmentToDestroy).toBeTruthy();
  });

  it("does not include equipment that hasn't been installed yet", () => {
    const installedEquipment: IInstalledEquipment[] = [];

    const hasEquipmentToDestroy = findEquipmentToDestroy(installedEquipment, 0);

    expect(hasEquipmentToDestroy).toBeFalsy();
  });

  it("does not include equipment that has been removed", () => {
    const installedEquipment: IInstalledEquipment[] = [
      {
        dateDestroyed: 3,
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const hasEquipmentToDestroy = findEquipmentToDestroy(installedEquipment, 3);

    expect(hasEquipmentToDestroy).toBeFalsy();
  });

  it("does include equipment that will be removed tomorrow", () => {
    const installedEquipment: IInstalledEquipment[] = [
      {
        dateDestroyed: 3,
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skin: "scarecrow",
        type: "equipment",
        x: 0,
        y: 0,
      },
    ];

    const hasEquipmentToDestroy = findEquipmentToDestroy(installedEquipment, 2);

    expect(hasEquipmentToDestroy).toBeTruthy();
  });
});
