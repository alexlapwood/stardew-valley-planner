import {
  calculateStageOfCrop,
  checkCropsToPlant,
  findCropToDestroy,
  getCropsLastDay
} from "./crop";
import { forEachTile, getCropsAtLocation } from "./farm";

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../data/sdv.json").crops;

// tslint:disable-next-line:no-var-requires
const cropMap: string[] = require("../data/crops.json");

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

export function renderCropsToContext(
  context: CanvasRenderingContext2D,
  cropsImage: HTMLImageElement,
  currentCrops: IFarmCrops,
  date: number
) {
  Object.keys(currentCrops)
    .sort((a, b) => Number(a) - Number(b))
    .map(yKey => {
      Object.keys(currentCrops[yKey]).map(xKey => {
        (currentCrops[yKey][xKey] as IPlantedCrop[]).map((plantedCrop, i) => {
          const plantedCropDetails = crops[plantedCrop.cropId];

          const cropsLastDay = getCropsLastDay(plantedCrop, plantedCropDetails);
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
    });
}

export function renderSelectedRegion(
  context: CanvasRenderingContext2D,
  currentCrops: IFarmCrops,
  date: number,
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  highlightGreenImage: HTMLImageElement,
  highlightGreyImage: HTMLImageElement,
  highlightRedImage: HTMLImageElement,
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
      currentCrops
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

  if (selectedItem.type === "tool") {
    if (selectedItem.id === "pick-axe") {
      forEachTile(highlightedRegion, (x, y) => {
        const plantedCrops = getCropsAtLocation(currentCrops, x, y);

        const hasCropToDestroy = findCropToDestroy(plantedCrops, date);

        if (hasCropToDestroy) {
          context.drawImage(highlightRedImage, x * 16, y * 16);
        } else {
          context.drawImage(highlightGreyImage, x * 16, y * 16);
        }
      });
    }
  }
}
