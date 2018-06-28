import {
  calculateStageOfCrop,
  checkCropsToPlant,
  findCropToDestroy,
  getCropsLastDay
} from "./crop";
import { forEachTile, getCropsAtLocation } from "./farm";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../data/sdv.json").crops;

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
        (currentCrops[yKey][xKey] as IPlantedCrop[]).map(
          ({ cropId, datePlanted, x, y }, i) => {
            const crop = crops.find(c => c.id === cropId);

            if (crop === undefined) {
              return;
            }

            const cropsLastDay = getCropsLastDay(crop, datePlanted);
            if (
              cropsLastDay === undefined ||
              date < datePlanted ||
              date > cropsLastDay
            ) {
              return;
            }

            const stage = calculateStageOfCrop(
              date - datePlanted,
              crop.stages,
              crop.regrow
            );

            const spriteIndex = stage + 1;
            const isFlower = crop.isFlower && spriteIndex > crop.stages.length;

            renderCropToContext(
              context,
              cropsImage,
              stage + 1,
              x,
              y,
              crop.name,
              isFlower
            );
          }
        );
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
