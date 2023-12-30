import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  findCropToDestroy,
  findEquipmentToDestroy
} from "./itemPlacement";

import testFarm from "../__mocks__/testFarm";

describe("checkCropsToPlant", () => {
  it("can detect overlapping crops", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
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
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
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
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
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
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }
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
            y: 0
          }
        ]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
    );

    expect(plantableCrops).toHaveLength(6);
    expect(unplantableCrops).toHaveLength(0);
  });

  it("can detect overlapping equipment", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, type: "crop", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
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
      { cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 5,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      testFarm
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
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 1,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 2,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect crops that are still growing here", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(4);
  });

  it("can install equipment before crops are planted", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {
      0: {
        0: [{ cropId: "parsnip", datePlanted: 5, type: "crop", x: 0, y: 0 }]
      }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect overlapping equipment", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 1,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 2,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 999,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(0);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can install equipment before other equipment is installed", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 1,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 2,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 3,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 4,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 5,
        equipmentId: "scarecrow",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 5,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect overlapping flooring", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 1,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 2,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "flooring",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("does not detect overlapping flooring and equipment", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 1,
        y: 0
      },
      {
        dateInstalled: 0,
        equipmentId: "flooring",
        skinIndex: 0,
        type: "equipment",
        x: 2,
        y: 0
      }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: {
        0: [
          {
            dateInstalled: 0,
            equipmentId: "scarecrow",
            skinIndex: 0,
            type: "equipment",
            x: 0,
            y: 0
          }
        ]
      }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(
      equipmentToInstall,
      {
        currentCrops,
        currentEquipment
      },
      testFarm
    );

    expect(installableEquipment).toHaveLength(3);
    expect(notInstallableEquipment).toHaveLength(0);
  });
});

describe("findCropToDestroy", () => {
  it("can find crops planted today", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("can find crops on their last day", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 3);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("does not include crops that haven't been planted yet", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 1, type: "crop", x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeFalsy();
  });

  it("does not include crops that have died", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, type: "crop", x: 0, y: 0 }
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
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
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
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
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
        skinIndex: 0,
        type: "equipment",
        x: 0,
        y: 0
      }
    ];

    const hasEquipmentToDestroy = findEquipmentToDestroy(installedEquipment, 2);

    expect(hasEquipmentToDestroy).toBeTruthy();
  });
});
