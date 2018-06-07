import {
  calculateStageOfCrop,
  checkCropsToPlant,
  getCropsLastDay
} from "./crop";

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
  selectedCropId: string,
  selectedRegionImage: HTMLImageElement,
  selectedRegionErrorImage: HTMLImageElement
) {
  const { x1, x2, y1, y2 } = highlightedRegion;

  const xDirection = Math.sign(x2 - x1) || 1;
  const yDirection = Math.sign(y2 - y1) || 1;

  const cropsToPlant: IPlantedCrop[] = [];

  for (let y = y1; y !== y2 + yDirection; y += yDirection) {
    for (let x = x1; x !== x2 + xDirection; x += xDirection) {
      cropsToPlant.push({
        cropId: selectedCropId,
        datePlanted: date,
        x,
        y
      });
    }
  }

  const { plantableCrops, unplantableCrops } = checkCropsToPlant(
    cropsToPlant,
    currentCrops
  );

  plantableCrops.forEach(cropToPlant => {
    context.drawImage(
      selectedRegionImage,
      cropToPlant.x * 16,
      cropToPlant.y * 16
    );
  });

  unplantableCrops.forEach(cropToPlant => {
    context.drawImage(
      selectedRegionErrorImage,
      cropToPlant.x * 16,
      cropToPlant.y * 16
    );
  });
}
