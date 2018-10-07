import { calculateStageOfCrop } from "./crop";
import {
  forEachFarmItem,
  forEachTile,
  getCropsAtLocation,
  getEquipmentAtLocation,
  getFenceMap,
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

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../data/sdv.json").crops;

// tslint:disable-next-line:no-var-requires
const cropMap: string[] = require("../data/crops.json");

// tslint:disable-next-line:no-var-requires
const equipmentMap: string[] = require("../data/equipment.json");

const tileMap = [0, 12, 15, 11, 13, 9, 14, 10, 4, 8, 3, 7, 1, 5, 2, 6];

const fenceTileMap = [5, 3, 2, 8, 0, 6, 7, 7, 5, 3, 2, 8, 0, 6, 7, 7];

export function renderSoilToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  isWet: boolean,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number
) {
  const soilMap = getSoilMap(farmItems, date);

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

      const tileOffset = isWet ? 4 * 16 : 0;

      if (cell) {
        context.drawImage(
          tileset,
          (tileMap[tileIndex] % 4) * 16 + tileOffset,
          Math.floor(tileMap[tileIndex] / 4) * 16,
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
  fenceImage: HTMLImageElement,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number
) {
  const fenceMap = getFenceMap(farmItems, date);

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

      if (farmItem.equipmentId === "fence") {
        renderFenceToContext(context, fenceImage, farmItem, fenceMap);

        return;
      }

      renderEquipmentToContext(context, equipmentImage, farmItem);
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
  equipment: IInstalledEquipment
) {
  const { equipmentId, skinIndex, x, y } = equipment;

  context.drawImage(
    sprite,
    equipmentMap.indexOf(equipmentId) * 16,
    16 + skinIndex * 32,
    16,
    32,
    x * 16,
    y * 16 + 16 - 32 - 4,
    16,
    32
  );
}

export function renderFenceToContext(
  context: CanvasRenderingContext2D,
  fenceImage:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  installedFence: IInstalledEquipment,
  fenceMap: number[][]
) {
  const north =
    fenceMap[installedFence.x] !== undefined &&
    fenceMap[installedFence.x][installedFence.y - 1] ===
      installedFence.skinIndex;
  const east =
    fenceMap[installedFence.x - 1] !== undefined &&
    fenceMap[installedFence.x - 1][installedFence.y] ===
      installedFence.skinIndex;
  const west =
    fenceMap[installedFence.x + 1] !== undefined &&
    fenceMap[installedFence.x + 1][installedFence.y] ===
      installedFence.skinIndex;
  const south =
    fenceMap[installedFence.x] !== undefined &&
    fenceMap[installedFence.x][installedFence.y + 1] ===
      installedFence.skinIndex;

  const tileIndex = 1 * +north + 2 * +east + 4 * +west + 8 * +south;

  context.drawImage(
    fenceImage,
    installedFence.skinIndex * 48 + (fenceTileMap[tileIndex] % 3) * 16,
    Math.floor(fenceTileMap[tileIndex] / 3) * 32,
    16,
    32,
    installedFence.x * 16,
    installedFence.y * 16 - 16,
    16,
    32
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
  fenceImage: HTMLImageElement,
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
        skinIndex: selectedItem.skinIndex || 0,
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
      context.drawImage(
        highlightGreenImage,
        equipmentToInstall.x * 16,
        equipmentToInstall.y * 16
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
