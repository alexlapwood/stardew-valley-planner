import { getCropsLastDay } from "./crop";

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("../data/sdv.json").crops;

const { standardFarm }: { [index: string]: string[] } =
  // tslint:disable-next-line:no-var-requires
  require("../data/sdv.json").farmLayouts;

export function forEachTile(
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  cb: (x: number, y: number) => any
) {
  const { x1, x2, y1, y2 } = highlightedRegion;

  if (isNaN(x1) || isNaN(x2) || isNaN(y1) || isNaN(y2)) {
    return;
  }

  const xDirection = Math.sign(x2 - x1) || 1;
  const yDirection = Math.sign(y2 - y1) || 1;

  for (let y = y1; y !== y2 + yDirection; y += yDirection) {
    for (let x = x1; x !== x2 + xDirection; x += xDirection) {
      cb(x, y);
    }
  }
}

export function forEachFarmItem<T>(
  farmItems: IFarmItems<T>,
  callback: (farmItem: T, x: number, y: number) => void
) {
  Object.keys(farmItems)
    .sort((a, b) => Number(a) - Number(b))
    // Remove duplicates - This is safe because all we want are the coordinates
    .filter((value, index, array) => array.indexOf(value) === index)
    .map(yKey => {
      if (farmItems[yKey] !== undefined) {
        Object.keys(farmItems[yKey]).map(xKey => {
          callback(farmItems[yKey][xKey], Number(xKey), Number(yKey));
        });
      }
    });
}

export function isCropHereToday(plantedCrop: IPlantedCrop, date: number) {
  const plantedCropDetails = crops[plantedCrop.cropId];

  const cropsLastDay = getCropsLastDay(plantedCrop, plantedCropDetails);
  if (
    cropsLastDay === undefined ||
    date < plantedCrop.datePlanted ||
    date > cropsLastDay
  ) {
    return false;
  }

  return true;
}

export function isEquipmentHereToday(
  installedEquipment: IInstalledEquipment,
  date: number
) {
  if (
    date < installedEquipment.dateInstalled ||
    (installedEquipment.dateDestroyed !== undefined &&
      date > installedEquipment.dateDestroyed - 1)
  ) {
    return false;
  }

  return true;
}

export function getCropsAtLocation(
  currentCrops: IFarmCrops,
  x: number,
  y: number
) {
  if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
    return currentCrops[y][x];
  }

  return [] as IPlantedCrop[];
}

export function getEquipmentAtLocation(
  currentEquipment: IFarmEquipment,
  x: number,
  y: number
) {
  if (
    currentEquipment[y] !== undefined &&
    currentEquipment[y][x] !== undefined
  ) {
    return currentEquipment[y][x];
  }

  return [] as IInstalledEquipment[];
}

export function getSoilMap(
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  date: number
) {
  const soilMap: boolean[][] = [];

  forEachFarmItem<Array<IPlantedCrop | IInstalledEquipment>>(
    { ...currentCrops, ...currentEquipment },
    (farmItems, x, y) => {
      farmItems.map(farmItem => {
        if (farmItem.type === "crop") {
          if (!isCropHereToday(farmItem, date)) {
            return;
          }

          if (soilMap[x] === undefined) {
            soilMap[x] = [];
          }

          soilMap[x][y] = true;
        }

        if (farmItem.type === "equipment") {
          if (!isEquipmentHereToday(farmItem, date)) {
            return;
          }

          if (farmItem.equipmentId === "sprinkler") {
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
                  if (soilMap[x + ix] === undefined) {
                    soilMap[x + ix] = [];
                  }

                  soilMap[x + ix][y + iy] = true;
                }
              }
            }
          }
        }
      });
    }
  );

  return soilMap;
}
