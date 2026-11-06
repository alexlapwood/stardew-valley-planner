import { crops } from "../data/game/crops.json";
import { getCropsLastDay } from "./crop";
import {
  getItemSkin,
  getRangeOffsets,
  isFenceItem,
  isFloorItem,
} from "./items";
import { canPlantAt, canWaterAt } from "./placementRules";
import { getTreesLastDay, isTreeHereToday } from "./tree";

type TTileTest = (farmMap: IFarmMap, x: number, y: number) => boolean;

export function forEachTileInRegion(
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  cb: (x: number, y: number) => void,
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
  callback: (farmItem: T) => void,
) {
  Object.keys(farmItems)
    .toSorted((a, b) => Number(a) - Number(b))
    .forEach((yKey) => {
      if (farmItems[yKey] !== undefined) {
        Object.keys(farmItems[yKey]).forEach((xKey) => {
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

export function getPlantedLastDay(plantedItem: TPlantedItem) {
  return plantedItem.type === "tree"
    ? getTreesLastDay(plantedItem)
    : getCropsLastDay(plantedItem, crops[plantedItem.cropId]);
}

export function isEquipmentHereToday(
  installedEquipment: IInstalledEquipment,
  date: number,
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
  y: number,
) {
  if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
    return currentCrops[y][x];
  }

  return [] as TPlantedItem[];
}

export function getEquipmentAtLocation(
  currentEquipment: IFarmEquipment,
  x: number,
  y: number,
) {
  if (
    currentEquipment[y] !== undefined &&
    currentEquipment[y][x] !== undefined
  ) {
    return currentEquipment[y][x];
  }

  return [] as IInstalledEquipment[];
}

function markRangeOnSoil(
  tileMap: (number | undefined)[][],
  range: IItemRange,
  x: number,
  y: number,
  farmMap: IFarmMap,
  isInRange: TTileTest,
) {
  getRangeOffsets(range).forEach(([dx, dy]) => {
    if (!isInRange(farmMap, x + dx, y + dy)) {
      return;
    }

    if (tileMap[x + dx] === undefined) {
      tileMap[x + dx] = [];
    }

    tileMap[x + dx][y + dy] = 0;
  });
}

type TSoilMap = (number | undefined)[][];

function markWateredRange(
  soilMap: TSoilMap,
  farmItem: TFarmItem,
  date: number,
  farmMap: IFarmMap,
) {
  if (farmItem.type !== "equipment" || !isEquipmentHereToday(farmItem, date)) {
    return;
  }

  const waterRange = getItemSkin(
    farmItem.equipmentId,
    farmItem.skin,
  )?.waterRange;

  if (waterRange !== undefined) {
    markRangeOnSoil(
      soilMap,
      waterRange,
      farmItem.x,
      farmItem.y,
      farmMap,
      canWaterAt,
    );
  }
}

function isStandingOnTile(farmItem: TFarmItem, date: number) {
  if (farmItem.type === "equipment") {
    return isEquipmentHereToday(farmItem, date);
  }

  return farmItem.type === "tree" && isTreeHereToday(farmItem, date);
}

function clearSoilUnderItems(
  soilMap: TSoilMap,
  farmItems: IFarmItems<TFarmItem[]>,
  date: number,
) {
  forEachFarmItem<TFarmItem>(farmItems, (farmItem) => {
    const { x, y } = farmItem;

    if (soilMap[x]?.[y] !== undefined && isStandingOnTile(farmItem, date)) {
      soilMap[x][y] = undefined;
    }
  });
}

export function getSoilMap(
  farmItems: IFarmItems<TFarmItem[]>,
  date: number,
  farmMap: IFarmMap,
) {
  const soilMap: TSoilMap = [];

  forEachFarmItem<TFarmItem>(farmItems, (farmItem) => {
    const { x, y } = farmItem;

    if (farmItem.type === "crop" && isCropHereToday(farmItem, date)) {
      if (soilMap[x] === undefined) {
        soilMap[x] = [];
      }

      soilMap[x][y] = 0;
    }

    markWateredRange(soilMap, farmItem, date, farmMap);
  });

  clearSoilUnderItems(soilMap, farmItems, date);

  return soilMap;
}

export function getWateredSoilMap(
  farmItems: IFarmItems<TFarmItem[]>,
  date: number,
  farmMap: IFarmMap,
) {
  const soilMap: TSoilMap = [];

  forEachFarmItem<TFarmItem>(farmItems, (farmItem) => {
    markWateredRange(soilMap, farmItem, date, farmMap);
  });

  clearSoilUnderItems(soilMap, farmItems, date);

  return soilMap;
}

function getEquipmentMap(
  farmItems: IFarmItems<TFarmItem[]>,
  date: number,
  isWanted: (equipmentId: string) => boolean,
) {
  const equipmentMap: IInstalledEquipment[][] = [];

  forEachFarmItem<TFarmItem>(farmItems, (farmItem) => {
    if (
      farmItem.type !== "equipment" ||
      !isWanted(farmItem.equipmentId) ||
      !isEquipmentHereToday(farmItem, date)
    ) {
      return;
    }

    if (equipmentMap[farmItem.x] === undefined) {
      equipmentMap[farmItem.x] = [];
    }

    equipmentMap[farmItem.x][farmItem.y] = farmItem;
  });

  return equipmentMap;
}

export function getFlooringMap(
  currentEquipment: IFarmItems<TFarmItem[]>,
  date: number,
) {
  return getEquipmentMap(currentEquipment, date, isFloorItem);
}

export function getFenceMap(
  currentEquipment: IFarmItems<TFarmItem[]>,
  date: number,
) {
  return getEquipmentMap(currentEquipment, date, isFenceItem).map((column) =>
    column.map(({ skin }) => skin),
  );
}

export function getScarecrowMap(
  currentEquipment: IFarmItems<TFarmItem[]>,
  date: number,
  farmMap: IFarmMap,
) {
  const scarecrowMap: number[][] = [];

  forEachFarmItem<TFarmItem>(currentEquipment, (installedEquipment) => {
    if (installedEquipment.type !== "equipment") {
      return;
    }

    const { x, y } = installedEquipment;
    const crowRange = getItemSkin(
      installedEquipment.equipmentId,
      installedEquipment.skin,
    )?.crowRange;

    if (
      crowRange === undefined ||
      !isEquipmentHereToday(installedEquipment, date)
    ) {
      return;
    }

    markRangeOnSoil(scarecrowMap, crowRange, x, y, farmMap, canPlantAt);

    if (scarecrowMap[x] === undefined) {
      scarecrowMap[x] = [];
    }

    scarecrowMap[x][y] = 0;
  });

  return scarecrowMap;
}
