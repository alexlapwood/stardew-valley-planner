import { crops } from "../data/sdv.json";
import { getCropsLastDay } from "./crop";

export function forEachTileInRegion(
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  cb: (x: number, y: number) => any
) {
  const x1 = Math.min(highlightedRegion.x1, highlightedRegion.x2);
  const x2 = Math.max(highlightedRegion.x1, highlightedRegion.x2);
  const y1 = Math.min(highlightedRegion.y1, highlightedRegion.y2);
  const y2 = Math.max(highlightedRegion.y1, highlightedRegion.y2);

  if (isNaN(x1) || isNaN(x2) || isNaN(y1) || isNaN(y2)) {
    return;
  }

  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      cb(x, y);
    }
  }
}

export function forEachFarmItem<T>(
  farmItems: IFarmItems<T[]>,
  callback: (farmItem: T) => void
) {
  Object.keys(farmItems)
    .sort((a, b) => Number(a) - Number(b))
    .map((yKey) => {
      if (farmItems[yKey] !== undefined) {
        Object.keys(farmItems[yKey]).map((xKey) => {
          farmItems[yKey][xKey].forEach((farmItem: T) => {
            callback(farmItem);
          });
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
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number,
  currentFarm: string[]
) {
  const soilMap: number[][] = [];

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, (farmItem) => {
    const { x, y } = farmItem;
    if (farmItem.type === "crop") {
      if (!isCropHereToday(farmItem, date)) {
        return;
      }

      if (soilMap[x] === undefined) {
        soilMap[x] = [];
      }

      soilMap[x][y] = 0;
    }

    if (farmItem.type === "equipment") {
      if (!isEquipmentHereToday(farmItem, date)) {
        return;
      }

      if (farmItem.equipmentId === "sprinkler") {
        if (farmItem.skinIndex === 0) {
          for (let iy = -1; iy <= 1; iy++) {
            for (
              let ix = Math.max(-1, Math.abs(iy) - 1);
              ix <= Math.min(1, 1 - Math.abs(iy));
              ix++
            ) {
              if (
                currentFarm[y + iy] &&
                currentFarm[y + iy][x + ix] &&
                currentFarm[y + iy][x + ix] === " "
              ) {
                if (soilMap[x + ix] === undefined) {
                  soilMap[x + ix] = [];
                }

                soilMap[x + ix][y + iy] = 0;
              }
            }
          }
        }

        if (farmItem.skinIndex === 1) {
          for (let iy = -1; iy <= 1; iy++) {
            for (let ix = -1; ix <= 1; ix++) {
              if (
                currentFarm[y + iy] &&
                currentFarm[y + iy][x + ix] &&
                currentFarm[y + iy][x + ix] === " "
              ) {
                if (soilMap[x + ix] === undefined) {
                  soilMap[x + ix] = [];
                }

                soilMap[x + ix][y + iy] = 0;
              }
            }
          }
        }

        if (farmItem.skinIndex === 2) {
          for (let iy = -2; iy <= 2; iy++) {
            for (let ix = -2; ix <= 2; ix++) {
              if (
                currentFarm[y + iy] &&
                currentFarm[y + iy][x + ix] &&
                currentFarm[y + iy][x + ix] === " "
              ) {
                if (soilMap[x + ix] === undefined) {
                  soilMap[x + ix] = [];
                }

                soilMap[x + ix][y + iy] = 0;
              }
            }
          }
        }
      }
    }
  });

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, (farmItem) => {
    if (farmItem.type === "equipment") {
      const { x, y } = farmItem;

      if (soilMap[x] === undefined || soilMap[x][y] === undefined) {
        return;
      }

      if (!isEquipmentHereToday(farmItem, date)) {
        return;
      }

      delete soilMap[x][y];
    }
  });

  return soilMap;
}

export function getFlooringMap(currentEquipment: IFarmEquipment, date: number) {
  const flooringMap: number[][] = [];

  forEachFarmItem<IInstalledEquipment>(
    currentEquipment,
    (installedEquipment) => {
      const { x, y } = installedEquipment;

      if (!isEquipmentHereToday(installedEquipment, date)) {
        return;
      }

      if (installedEquipment.equipmentId === "flooring") {
        if (flooringMap[x] === undefined) {
          flooringMap[x] = [];
        }

        flooringMap[x][y] = installedEquipment.skinIndex;
      }
    }
  );

  return flooringMap;
}

export function getFenceMap(
  currentEquipment: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number
) {
  const fenceMap: number[][] = [];

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(
    currentEquipment,
    (installedEquipment) => {
      if (installedEquipment.type === "equipment") {
        const { x, y } = installedEquipment;

        if (!isEquipmentHereToday(installedEquipment, date)) {
          return;
        }

        if (installedEquipment.equipmentId === "fence") {
          if (fenceMap[x] === undefined) {
            fenceMap[x] = [];
          }

          fenceMap[x][y] = installedEquipment.skinIndex;
        }
      }
    }
  );

  return fenceMap;
}

export function getScarecrowMap(
  currentEquipment: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number,
  currentFarm: string[]
) {
  const scarecrowMap: number[][] = [];

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(
    currentEquipment,
    (installedEquipment) => {
      if (installedEquipment.type === "equipment") {
        const { x, y } = installedEquipment;

        if (!isEquipmentHereToday(installedEquipment, date)) {
          return;
        }

        if (installedEquipment.equipmentId === "scarecrow") {
          if (scarecrowMap[x] === undefined) {
            scarecrowMap[x] = [];
          }

          for (let iy = -8; iy <= 8; iy++) {
            // 4, 5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 6, 5, 4
            const rowWidth = Math.min(-Math.abs(iy) + 12, 8);
            for (let ix = -rowWidth; ix <= rowWidth; ix++) {
              if (
                currentFarm[y + iy] &&
                currentFarm[y + iy][x + ix] &&
                currentFarm[y + iy][x + ix] === " "
              ) {
                if (scarecrowMap[x + ix] === undefined) {
                  scarecrowMap[x + ix] = [];
                }

                scarecrowMap[x + ix][y + iy] = 0;
              }
            }
          }

          scarecrowMap[x][y] = 0;
        }
      }
    }
  );

  return scarecrowMap;
}
