import { calculateStageOfCrop, getCropsLastDay } from "./crop";
import {
  forEachTile,
  getCropsAtLocation,
  getEquipmentAtLocation
} from "./farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  findCropToDestroy,
  findEquipmentToDestroy
} from "./itemPlacement";

const { standardFarm }: { [index: string]: string[] } =
  // tslint:disable-next-line:no-var-requires
  require("../data/sdv.json").farmLayouts;

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../data/sdv.json").crops;

// tslint:disable-next-line:no-var-requires
const cropMap: string[] = require("../data/crops.json");

// tslint:disable-next-line:no-var-requires
const equipmentMap: string[] = require("../data/equipment.json");

export function renderCropToContext(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
  spriteIndex: number,
  x: number,
  y: number,
  name: string,
  isFlower?: boolean
) {
  context.drawImage(
    sprite,
    spriteIndex * 16,
    cropMap.indexOf(name) * 32,
    16,
    32,
    x * 16,
    (y - 1) * 16,
    16,
    32
  );

  if (isFlower) {
    context.drawImage(
      sprite,
      (spriteIndex + 1) * 16,
      cropMap.indexOf(name) * 32,
      16,
      32,
      x * 16,
      (y - 1) * 16,
      16,
      32
    );
  }
}

export function renderEquipmentToContext(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
  spriteIndex: number,
  spriteSize: number,
  x: number,
  y: number,
  name: string
) {
  context.drawImage(
    sprite,
    equipmentMap.indexOf(name) * 16,
    16 + spriteIndex * spriteSize,
    16,
    spriteSize,
    x * 16,
    y * 16 + 16 - spriteSize - 4,
    16,
    spriteSize
  );
}

export function renderItemsToContext(
  context: CanvasRenderingContext2D,
  cropsImage: HTMLImageElement,
  equipmentImage: HTMLImageElement,
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  date: number
) {
  Object.keys({ ...currentCrops, ...currentEquipment })
    .sort((a, b) => Number(a) - Number(b))
    .filter((value, index, array) => array.indexOf(value) === index) // Remove duplicates
    .map(yKey => {
      if (currentCrops[yKey] !== undefined) {
        Object.keys(currentCrops[yKey]).map(xKey => {
          (currentCrops[yKey][xKey] as IPlantedCrop[]).map((plantedCrop, i) => {
            const plantedCropDetails = crops[plantedCrop.cropId];

            const cropsLastDay = getCropsLastDay(
              plantedCrop,
              plantedCropDetails
            );
            if (
              cropsLastDay === undefined ||
              date < plantedCrop.datePlanted ||
              date > cropsLastDay
            ) {
              return;
            }

            const stage = calculateStageOfCrop(
              date - plantedCrop.datePlanted,
              plantedCropDetails.stages,
              plantedCropDetails.regrow
            );

            const spriteIndex = stage + 1;
            const isFlower =
              plantedCropDetails.isFlower &&
              spriteIndex > plantedCropDetails.stages.length;

            renderCropToContext(
              context,
              cropsImage,
              stage + 1,
              plantedCrop.x,
              plantedCrop.y,
              plantedCropDetails.name,
              isFlower
            );
          });
        });
      }

      if (currentEquipment[yKey] !== undefined) {
        Object.keys(currentEquipment[yKey]).map(xKey => {
          (currentEquipment[yKey][xKey] as IInstalledEquipment[]).map(
            (installedEquipment, i) => {
              if (
                date < installedEquipment.dateInstalled ||
                (installedEquipment.dateDestroyed !== undefined &&
                  date > installedEquipment.dateDestroyed - 1)
              ) {
                return;
              }

              renderEquipmentToContext(
                context,
                equipmentImage,
                0,
                installedEquipment.equipmentId === "scarecrow" ? 32 : 16,
                installedEquipment.x,
                installedEquipment.y,
                installedEquipment.equipmentId
              );
            }
          );
        });
      }
    });
}

export function renderSelectedRegion(
  context: CanvasRenderingContext2D,
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  date: number,
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  highlightGreenImage: HTMLImageElement,
  highlightGreyImage: HTMLImageElement,
  highlightRedImage: HTMLImageElement,
  equipmentImage: HTMLImageElement,
  equipmentBoundaryImages: { [index: string]: HTMLImageElement },
  selectedItem: ISelectedItem
) {
  if (selectedItem.type === "crop") {
    const cropsToPlant: IPlantedCrop[] = [];

    forEachTile(highlightedRegion, (x, y) => {
      cropsToPlant.push({
        cropId: selectedItem.id,
        datePlanted: date,
        x,
        y
      });
    });

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment }
    );

    plantableCrops.forEach(cropToPlant => {
      context.drawImage(
        highlightGreenImage,
        cropToPlant.x * 16,
        cropToPlant.y * 16
      );
    });

    unplantableCrops.forEach(cropToPlant => {
      context.drawImage(
        highlightRedImage,
        cropToPlant.x * 16,
        cropToPlant.y * 16
      );
    });
  }

  if (selectedItem.type === "equipment") {
    const equipmentToInstallList: IInstalledEquipment[] = [];

    forEachTile(highlightedRegion, (x, y) => {
      equipmentToInstallList.push({
        dateInstalled: date,
        equipmentId: selectedItem.id,
        x,
        y
      });
    });

    const {
      installableEquipment,
      notInstallableEquipment
    } = checkEquipmentToInstall(equipmentToInstallList, {
      currentCrops,
      currentEquipment
    });

    installableEquipment.forEach(equipmentToInstall => {
      renderEquipmentBoundaryToContext(
        context,
        equipmentBoundaryImages[equipmentToInstall.equipmentId],
        equipmentToInstall.x,
        equipmentToInstall.y,
        equipmentToInstall.equipmentId
      );

      renderEquipmentToContext(
        context,
        equipmentImage,
        0,
        equipmentToInstall.equipmentId === "scarecrow" ? 32 : 16,
        equipmentToInstall.x,
        equipmentToInstall.y,
        equipmentToInstall.equipmentId
      );
    });

    notInstallableEquipment.forEach(equipmentToInstall => {
      context.drawImage(
        highlightRedImage,
        equipmentToInstall.x * 16,
        equipmentToInstall.y * 16
      );
    });
  }

  if (selectedItem.type === "tool") {
    if (selectedItem.id === "pick-axe") {
      forEachTile(highlightedRegion, (x, y) => {
        const plantedCrops = getCropsAtLocation(currentCrops, x, y);
        const installedEquipment = getEquipmentAtLocation(
          currentEquipment,
          x,
          y
        );

        const hasCropToDestroy = findCropToDestroy(plantedCrops, date);

        const hasEquipmentToDestroy = findEquipmentToDestroy(
          installedEquipment,
          date
        );

        if (hasCropToDestroy || hasEquipmentToDestroy) {
          context.drawImage(highlightRedImage, x * 16, y * 16);
        } else {
          context.drawImage(highlightGreyImage, x * 16, y * 16);
        }
      });
    }
  }
}

export function renderEquipmentBoundaries(
  context: CanvasRenderingContext2D,
  equipmentBoundaryImages: { [index: string]: HTMLImageElement },
  currentEquipment: IFarmEquipment,
  date: number
) {
  Object.keys(currentEquipment).map(yKey => {
    if (currentEquipment[yKey] !== undefined) {
      Object.keys(currentEquipment[yKey]).map(xKey => {
        (currentEquipment[yKey][xKey] as IInstalledEquipment[]).map(
          (installedEquipment, i) => {
            if (
              date < installedEquipment.dateInstalled ||
              (installedEquipment.dateDestroyed !== undefined &&
                date > installedEquipment.dateDestroyed - 1)
            ) {
              return;
            }

            renderEquipmentBoundaryToContext(
              context,
              equipmentBoundaryImages[installedEquipment.equipmentId],
              installedEquipment.x,
              installedEquipment.y,
              installedEquipment.equipmentId
            );
          }
        );
      });
    }
  });
}

export function renderEquipmentBoundaryToContext(
  context: CanvasRenderingContext2D,
  highlightGreenImage: HTMLImageElement,
  x: number,
  y: number,
  equipmentId: string
) {
  switch (equipmentId) {
    case "scarecrow":
      for (let iy = -8; iy <= 8; iy++) {
        for (
          let ix = Math.max(-8, Math.abs(iy) - 12);
          ix <= Math.min(8, 12 - Math.abs(iy));
          ix++
        ) {
          if (
            standardFarm[y + iy] &&
            standardFarm[y + iy][x + ix] &&
            standardFarm[y + iy][x + ix] === " "
          ) {
            context.drawImage(
              highlightGreenImage,
              (x + ix) * 16,
              (y + iy) * 16
            );
          }
        }
      }
      break;
    case "sprinkler":
      for (let iy = -1; iy <= 1; iy++) {
        for (
          let ix = Math.max(-1, Math.abs(iy) - 1);
          ix <= Math.min(1, 1 - Math.abs(iy));
          ix++
        ) {
          if (
            standardFarm[y + iy] &&
            standardFarm[y + iy][x + ix] &&
            standardFarm[y + iy][x + ix] === " "
          ) {
            context.drawImage(
              highlightGreenImage,
              (x + ix) * 16,
              (y + iy) * 16
            );
          }
        }
      }
      break;
  }
}
