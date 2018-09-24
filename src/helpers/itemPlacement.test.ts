import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  findCropToDestroy,
  findEquipmentToDestroy
} from "./itemPlacement";

describe("checkCropsToPlant", () => {
  it("can detect overlapping crops", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(1);
  });

  it("can detect crops that are still growing here", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });

  it("can detect crops that were planted after today", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });

  it("can detect overlapping equipment", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 0, x: 1, y: 0 },
      { cropId: "parsnip", datePlanted: 0, x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(0);
    expect(unplantableCrops).toHaveLength(3);
  });

  it("can detect equipment that will be installed in the future", () => {
    const cropsToPlant: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 2, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 3, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 4, x: 0, y: 0 },
      { cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 5, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    expect(plantableCrops).toHaveLength(2);
    expect(unplantableCrops).toHaveLength(4);
  });
});

describe("checkEquipmentToInstall", () => {
  it("can detect overlapping crops", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 0, equipmentId: "scarecrow", x: 1, y: 0 },
      { dateInstalled: 0, equipmentId: "scarecrow", x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect crops that are still growing here", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 1, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 2, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 3, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 4, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 5, equipmentId: "scarecrow", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(4);
  });

  it("can install equipment before crops are planted", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 1, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 2, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 3, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 4, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 5, equipmentId: "scarecrow", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {
      0: { 0: [{ cropId: "parsnip", datePlanted: 5, x: 0, y: 0 }] }
    };

    const currentEquipment: IFarmEquipment = {};

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect overlapping equipment", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 0, equipmentId: "scarecrow", x: 1, y: 0 },
      { dateInstalled: 0, equipmentId: "scarecrow", x: 2, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(2);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can detect equipment that was installed in the past", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 999, equipmentId: "scarecrow", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(0);
    expect(notInstallableEquipment).toHaveLength(1);
  });

  it("can install equipment before other equipment is installed", () => {
    const equipmentToInstall: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 1, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 2, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 3, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 4, equipmentId: "scarecrow", x: 0, y: 0 },
      { dateInstalled: 5, equipmentId: "scarecrow", x: 0, y: 0 }
    ];

    const currentCrops: IFarmCrops = {};

    const currentEquipment: IFarmEquipment = {
      0: { 0: [{ dateInstalled: 5, equipmentId: "scarecrow", x: 0, y: 0 }] }
    };

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstall, {
      currentCrops,
      currentEquipment
    });

    expect(installableEquipment).toHaveLength(5);
    expect(notInstallableEquipment).toHaveLength(1);
  });
});

describe("findCropToDestroy", () => {
  it("can find crops planted today", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("can find crops on their last day", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 3);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("does not include crops that haven't been planted yet", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 1, x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 0);

    expect(hasCropToDestroy).toBeFalsy();
  });

  it("does not include crops that have died", () => {
    const plantedCrops: IPlantedCrop[] = [
      { cropId: "parsnip", datePlanted: 0, x: 0, y: 0 }
    ];

    const hasCropToDestroy = findCropToDestroy(plantedCrops, 4);

    expect(hasCropToDestroy).toBeFalsy();
  });
});

describe("findEquipmentToDestroy", () => {
  it("can find equipment installed today", () => {
    const installedEquipment: IInstalledEquipment[] = [
      { dateInstalled: 0, equipmentId: "scarecrow", x: 0, y: 0 }
    ];

    const hasCropToDestroy = findEquipmentToDestroy(installedEquipment, 0);

    expect(hasCropToDestroy).toBeTruthy();
  });

  it("does not include equipment that hasn't been installed yet", () => {
    const installedEquipment: IInstalledEquipment[] = [];

    const hasCropToDestroy = findEquipmentToDestroy(installedEquipment, 0);

    expect(hasCropToDestroy).toBeFalsy();
  });

  it("does not include equipment that has been removed", () => {
    const installedEquipment: IInstalledEquipment[] = [
      {
        dateDestroyed: 3,
        dateInstalled: 1,
        equipmentId: "scarecrow",
        x: 0,
        y: 0
      }
    ];

    const hasCropToDestroy = findEquipmentToDestroy(installedEquipment, 4);

    expect(hasCropToDestroy).toBeFalsy();
  });
});