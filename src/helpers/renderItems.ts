import { crops, equipment, equipmentIds } from "../data/sdv.json";
import { calculateStageOfCrop } from "./crop";
import { getSeason } from "./date";
import {
  forEachFarmItem,
  getFenceMap,
  isCropHereToday,
  isEquipmentHereToday,
} from "./farm";

const fenceTileMap = [5, 3, 2, 8, 0, 6, 7, 7, 5, 3, 2, 8, 0, 6, 7, 7];

export function renderItemsToContext(
  context: CanvasRenderingContext2D,
  cropsImage: HTMLImageElement,
  equipmentImage: HTMLImageElement,
  fenceImage: HTMLImageElement,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number,
) {
  const fenceMap = getFenceMap(farmItems, date);

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, (farmItem) => {
    if (farmItem.type === "crop") {
      if (!isCropHereToday(farmItem, date)) {
        return;
      }

      const plantedCropDetails = crops[farmItem.cropId];

      const stage = calculateStageOfCrop(
        date - farmItem.datePlanted,
        plantedCropDetails.stages,
        plantedCropDetails.regrow,
      );

      const spriteIndex = stage + 1;
      const isFlower =
        plantedCropDetails.isFlower === true &&
        spriteIndex > plantedCropDetails.stages.length;

      renderCropToContext(
        context,
        cropsImage,
        stage + 1,
        farmItem.x,
        farmItem.y,
        plantedCropDetails.id,
        isFlower,
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

      renderEquipmentToContext(context, equipmentImage, farmItem, date);
    }
  });
}

export function renderCropToContext(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
  spriteIndex: number,
  x: number,
  y: number,
  id: string,
  isFlower?: boolean,
) {
  const cropIds = Object.keys(crops).toSorted((a, b) => a.localeCompare(b));

  context.drawImage(
    sprite,
    spriteIndex * 16,
    cropIds.indexOf(id) * 32,
    16,
    32,
    x * 16,
    (y - 1) * 16,
    16,
    32,
  );

  if (isFlower === true) {
    context.drawImage(
      sprite,
      (spriteIndex + 1) * 16,
      cropIds.indexOf(id) * 32,
      16,
      32,
      x * 16,
      (y - 1) * 16,
      16,
      32,
    );
  }
}

export function renderEquipmentToContext(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
  installedEquipment: IInstalledEquipment,
  date: number,
) {
  const { equipmentId, skinIndex, x, y } = installedEquipment;

  if (equipmentId === "fence" || equipmentId === "flooring") {
    return;
  }

  let equipmentIndex = equipmentIds
    .slice(0, equipmentIds.indexOf(equipmentId))
    .reduce((acc, id) => {
      if (id === "fence" || id === "flooring") {
        return acc;
      }

      if (equipment[id].isSeasonal === true) {
        return acc + equipment[id].skins.length * 4;
      }

      return acc + equipment[id].skins.length;
    }, 0);

  if (equipment[equipmentId].isSeasonal === true) {
    equipmentIndex = equipmentIndex + skinIndex * 4 + getSeason(date);
  } else {
    equipmentIndex = equipmentIndex + skinIndex;
  }

  context.drawImage(
    sprite,
    equipmentIndex * 16,
    0,
    16,
    32,
    x * 16,
    y * 16 + 16 - 32,
    16,
    32,
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
  fenceMap: number[][],
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
    32,
  );
}
