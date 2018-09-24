import { calculateStageOfCrop } from "./crop";
import {
  forEachFarmItem,
  forEachTile,
  getCropsAtLocation,
  getEquipmentAtLocation,
  getSoilMap,
  isCropHereToday,
  isEquipmentHereToday
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

export function renderSoilToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  date: number
) {
  const soilMap = getSoilMap(currentCrops, currentEquipment, date);

  soilMap.forEach((row, ix) => {
    row.forEach((cell, iy) => {
      const north =
        soilMap[ix] !== undefined && soilMap[ix][iy - 1] !== undefined;
      const east =
        soilMap[ix - 1] !== undefined && soilMap[ix - 1][iy] !== undefined;
      const west =
        soilMap[ix + 1] !== undefined && soilMap[ix + 1][iy] !== undefined;
      const south =
        soilMap[ix] !== undefined && soilMap[ix][iy + 1] !== undefined;

      const tileIndex = 1 * +north + 2 * +east + 4 * +west + 8 * +south;

      const tileX = (tileIndex % 4) * 16;
      const tileY = Math.floor(tileIndex / 4) * 16;

      if (cell) {
        context.drawImage(
          tileset,
          tileX,
          tileY,
          16,
          16,
          ix * 16,
          iy * 16,
          16,
          16
        );
      }
    });
  });
}

export function renderItemsToContext(
  context: CanvasRenderingContext2D,
  cropsImage: HTMLImageElement,
  equipmentImage: HTMLImageElement,
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  date: number
) {
  forEachFarmItem<Array<IPlantedCrop | IInstalledEquipment>>(
    { ...currentCrops, ...currentEquipment },
    (farmItems, x, y) => {
      farmItems.map(farmItem => {
        if (farmItem.type === "crop") {
          if (!isCropHereToday(farmItem, date)) {
            return;
          }

          const plantedCropDetails = crops[farmItem.cropId];

          const stage = calculateStageOfCrop(
            date - farmItem.datePlanted,
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
            x,
            y,
            plantedCropDetails.name,
            isFlower
          );
        }

        if (farmItem.type === "equipment") {
          if (!isEquipmentHereToday(farmItem, date)) {
            return;
          }

          renderEquipmentToContext(
            context,
            equipmentImage,
            0,
            farmItem.equipmentId === "scarecrow" ? 32 : 16,
            farmItem.x,
            farmItem.y,
            farmItem.equipmentId
          );
        }
      });
    }
  );
}

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
        type: "crop",
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
        type: "equipment",
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
  forEachFarmItem<IInstalledEquipment[]>(
    currentEquipment,
    (equipment, x, y) => {
      equipment.forEach(installedEquipment => {
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
      });
    }
  );
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
  }
}
