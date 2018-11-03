import { mergeDeep } from "immutable";
import { getCropsLastDay } from "./crop";
import { getCropsAtLocation, getEquipmentAtLocation } from "./farm";

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../data/sdv.json").crops;

const { standardFarm }: { [index: string]: string[] } =
  // tslint:disable-next-line:no-var-requires
  require("../data/sdv.json").farmLayouts;

export function checkCropsToPlant(
  cropsToPlant: IPlantedCrop[],
  currentItems: {
    currentCrops: IFarmCrops;
    currentEquipment: IFarmEquipment;
  }
) {
  return cropsToPlant.reduce(
    (
      acc: {
        plantableCrops: IPlantedCrop[];
        unplantableCrops: IPlantedCrop[];
      },
      cropToPlant
    ) => {
      const plantedCrops = getCropsAtLocation(
        currentItems.currentCrops,
        cropToPlant.x,
        cropToPlant.y
      );

      const installedEquipmentList = getEquipmentAtLocation(
        currentItems.currentEquipment,
        cropToPlant.x,
        cropToPlant.y
      );

      const plantedCropConflict = plantedCrops.find(plantedCrop => {
        const plantedCropDetails = crops[plantedCrop.cropId];
        const cropToPlantsDetails = crops[cropToPlant.cropId];

        const plantedCropsLastDay = getCropsLastDay(
          plantedCrop,
          plantedCropDetails
        );

        const cropToPlantsLastDay = getCropsLastDay(
          cropToPlant,
          cropToPlantsDetails
        );

        const conflictWhilePlanting =
          cropToPlant.datePlanted >= plantedCrop.datePlanted &&
          (plantedCropsLastDay === undefined ||
            cropToPlant.datePlanted <= plantedCropsLastDay);

        const conflictDuringGrowth =
          plantedCrop.datePlanted !== plantedCrop.dateDestroyed &&
          cropToPlant.datePlanted < plantedCrop.datePlanted &&
          (cropToPlantsLastDay === undefined ||
            cropToPlantsLastDay >= plantedCrop.datePlanted);

        if (conflictWhilePlanting || conflictDuringGrowth) {
          return true;
        }

        return false;
      });

      const installedEquipmentConflict = installedEquipmentList.find(
        installedEquipment => {
          const cropToPlantsDetails = crops[cropToPlant.cropId];

          const cropToPlantsLastDay = getCropsLastDay(
            cropToPlant,
            cropToPlantsDetails
          );

          const conflictWhilePlanting =
            cropToPlant.datePlanted >= installedEquipment.dateInstalled &&
            (installedEquipment.dateDestroyed === undefined ||
              cropToPlant.datePlanted <= installedEquipment.dateDestroyed - 1);

          const conflictDuringGrowth =
            installedEquipment.dateInstalled !==
              installedEquipment.dateDestroyed &&
            cropToPlant.datePlanted < installedEquipment.dateInstalled &&
            (cropToPlantsLastDay === undefined ||
              cropToPlantsLastDay >= installedEquipment.dateInstalled);

          if (conflictWhilePlanting || conflictDuringGrowth) {
            return true;
          }

          return false;
        }
      );

      const isTryingToPlantInSoil =
        standardFarm[cropToPlant.y][cropToPlant.x] === " ";

      if (
        plantedCropConflict === undefined &&
        installedEquipmentConflict === undefined &&
        isTryingToPlantInSoil
      ) {
        return mergeDeep(acc, {
          plantableCrops: [cropToPlant]
        });
      }

      return mergeDeep(acc, {
        unplantableCrops: [cropToPlant]
      });
    },
    { plantableCrops: [], unplantableCrops: [] }
  ) as {
    plantableCrops: IPlantedCrop[];
    unplantableCrops: IPlantedCrop[];
  };
}

export function checkEquipmentToInstall(
  equipmentToInstallList: IInstalledEquipment[],
  currentItems: { currentCrops: IFarmCrops; currentEquipment: IFarmEquipment }
) {
  return equipmentToInstallList.reduce(
    (
      acc: {
        installableEquipment: IInstalledEquipment[];
        notInstallableEquipment: IInstalledEquipment[];
      },
      equipmentToInstall
    ) => {
      const plantedCrops = getCropsAtLocation(
        currentItems.currentCrops,
        equipmentToInstall.x,
        equipmentToInstall.y
      );

      const installedEquipmentList = getEquipmentAtLocation(
        currentItems.currentEquipment,
        equipmentToInstall.x,
        equipmentToInstall.y
      );

      const plantedCropConflictPast = plantedCrops.find(plantedCrop => {
        const plantedCropDetails = crops[plantedCrop.cropId];

        const plantedCropsLastDay = getCropsLastDay(
          plantedCrop,
          plantedCropDetails
        );

        const conflictWhileInstalling =
          equipmentToInstall.dateInstalled >= plantedCrop.datePlanted &&
          (plantedCropsLastDay === undefined ||
            equipmentToInstall.dateInstalled <= plantedCropsLastDay);

        if (conflictWhileInstalling) {
          return true;
        }

        return false;
      });

      const installedEquipmentConflictPast = installedEquipmentList.find(
        installedEquipment => {
          if (
            (equipmentToInstall.equipmentId === "flooring") !==
            (installedEquipment.equipmentId === "flooring")
          ) {
            return false;
          }

          const conflictWhileInstalling =
            equipmentToInstall.dateInstalled >=
              installedEquipment.dateInstalled &&
            (installedEquipment.dateDestroyed === undefined ||
              equipmentToInstall.dateInstalled <=
                installedEquipment.dateDestroyed - 1);

          if (conflictWhileInstalling) {
            return true;
          }

          return false;
        }
      );

      let dateDestroyed = plantedCrops.reduce(
        (dateDestroyedAcc: number | undefined, plantedCrop) => {
          const conflictInTheFuture =
            equipmentToInstall.dateInstalled < plantedCrop.datePlanted;

          if (
            conflictInTheFuture &&
            plantedCrop.datePlanted !== plantedCrop.dateDestroyed
          ) {
            return dateDestroyedAcc === undefined
              ? plantedCrop.datePlanted
              : Math.min(dateDestroyedAcc, plantedCrop.datePlanted);
          }

          return dateDestroyedAcc;
        },
        undefined
      );

      dateDestroyed = installedEquipmentList.reduce(
        (dateDestroyedAcc: number | undefined, installedEquipment) => {
          const conflictInTheFuture =
            equipmentToInstall.dateInstalled < installedEquipment.dateInstalled;

          if (
            conflictInTheFuture &&
            installedEquipment.dateInstalled !==
              installedEquipment.dateDestroyed
          ) {
            return dateDestroyedAcc === undefined
              ? installedEquipment.dateInstalled
              : Math.min(dateDestroyedAcc, installedEquipment.dateInstalled);
          }

          return dateDestroyedAcc;
        },
        dateDestroyed
      );

      const isTryingToInstallInSoil =
        standardFarm[equipmentToInstall.y][equipmentToInstall.x] === " ";

      if (
        plantedCropConflictPast === undefined &&
        installedEquipmentConflictPast === undefined &&
        isTryingToInstallInSoil
      ) {
        return mergeDeep(acc, {
          installableEquipment: [{ ...equipmentToInstall, dateDestroyed }]
        });
      }

      return mergeDeep(acc, {
        notInstallableEquipment: [equipmentToInstall]
      });
    },
    { installableEquipment: [], notInstallableEquipment: [] }
  ) as {
    installableEquipment: IInstalledEquipment[];
    notInstallableEquipment: IInstalledEquipment[];
  };
}

export function findCropToDestroy(
  plantedCrops: IPlantedCrop[],
  dateToDestroyOn: number
) {
  return plantedCrops.find(plantedCrop => {
    const plantedCropDetails = crops[plantedCrop.cropId];

    const plantedCropsLastDay = getCropsLastDay(
      plantedCrop,
      plantedCropDetails
    );

    if (
      (plantedCrop.dateDestroyed === undefined ||
        dateToDestroyOn < plantedCrop.dateDestroyed) &&
      dateToDestroyOn >= plantedCrop.datePlanted &&
      (plantedCropsLastDay === undefined ||
        dateToDestroyOn <= plantedCropsLastDay)
    ) {
      return true;
    }

    return false;
  });
}

export function findEquipmentToDestroy(
  installedEquipmentList: IInstalledEquipment[],
  dateToDestroyOn: number
) {
  return installedEquipmentList.find(installedEquipment => {
    if (
      (installedEquipment.dateDestroyed === undefined ||
        dateToDestroyOn < installedEquipment.dateDestroyed) &&
      dateToDestroyOn >= installedEquipment.dateInstalled
    ) {
      return true;
    }

    return false;
  });
}

export function destroyCrops(
  plantedCrops: IPlantedCrop[],
  dateToDestroyOn: number
) {
  return plantedCrops.map(plantedCrop => {
    const cropToChecksDetails = crops[plantedCrop.cropId];

    const cropToChecksLastDay = getCropsLastDay(
      plantedCrop,
      cropToChecksDetails
    );
    if (
      (plantedCrop.dateDestroyed === undefined ||
        dateToDestroyOn < plantedCrop.dateDestroyed) &&
      dateToDestroyOn >= plantedCrop.datePlanted &&
      (cropToChecksLastDay === undefined ||
        dateToDestroyOn <= cropToChecksLastDay)
    ) {
      plantedCrop.dateDestroyed = dateToDestroyOn;
    }
    return plantedCrop;
  });
}

export function destroyEquipment(
  installedEquipmentList: IInstalledEquipment[],
  dateToDestroyOn: number
) {
  return installedEquipmentList.map(installedEquipment => {
    if (
      (installedEquipment.dateDestroyed === undefined ||
        dateToDestroyOn < installedEquipment.dateDestroyed) &&
      dateToDestroyOn >= installedEquipment.dateInstalled
    ) {
      installedEquipment.dateDestroyed = dateToDestroyOn;
    }
    return installedEquipment;
  });
}
