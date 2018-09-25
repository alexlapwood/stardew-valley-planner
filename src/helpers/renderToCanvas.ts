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
import merge from "./merge";

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

      if (cell) {
        context.drawImage(
          tileset,
          tileIndex * 16,
          0,
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
  let farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>> = {};

  farmItems = merge(farmItems, currentCrops);
  farmItems = merge(farmItems, currentEquipment);

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, farmItem => {
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
        farmItem.x,
        farmItem.y,
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
        32,
        farmItem.x,
        farmItem.y,
        farmItem.equipmentId
      );
    }
  });
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
      renderEquipmentToContext(
        context,
        equipmentImage,
        0,
        32,
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
