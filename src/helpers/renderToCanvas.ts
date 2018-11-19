import { calculateStageOfCrop } from "./crop";
import { getSeason } from "./date";
import {
  forEachFarmItem,
  forEachTileInRegion,
  getCropsAtLocation,
  getEquipmentAtLocation,
  getFenceMap,
  getFlooringMap,
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
const { crops, equipment, equipmentIds } = require("../data/sdv.json") as {
  crops: { [index: string]: ICrop };
  equipment: { [index: string]: IEquipment };
  equipmentIds: string[];
};

const flooringTileMap = [0, 12, 15, 11, 13, 9, 14, 10, 4, 8, 3, 7, 1, 5, 2, 6];

const fenceTileMap = [5, 3, 2, 8, 0, 6, 7, 7, 5, 3, 2, 8, 0, 6, 7, 7];

function forEachTileInMap(
  tileMap: number[][],
  callBack: (tileValue: number, tileIndex: number, x: number, y: number) => void
) {
  tileMap.forEach((row, ix) => {
    row.forEach((cellValue, iy) => {
      const north =
        tileMap[ix] !== undefined && tileMap[ix][iy - 1] === cellValue;
      const east =
        tileMap[ix - 1] !== undefined && tileMap[ix - 1][iy] === cellValue;
      const west =
        tileMap[ix + 1] !== undefined && tileMap[ix + 1][iy] === cellValue;
      const south =
        tileMap[ix] !== undefined && tileMap[ix][iy + 1] === cellValue;

      const tileIndex = 1 * +north + 2 * +east + 4 * +west + 8 * +south;

      callBack(cellValue, tileIndex, ix, iy);
    });
  });
}

export function renderSoilToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number
) {
  const soilMap = getSoilMap(farmItems, date);

  forEachTileInMap(soilMap, (tileValue, tileIndex, x, y) => {
    context.drawImage(
      tileset,
      (flooringTileMap[tileIndex] % 4) * 16,
      Math.floor(flooringTileMap[tileIndex] / 4) * 16,
      16,
      16,
      x * 16,
      y * 16,
      16,
      16
    );
  });
}

export function renderWateredSoilToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  farmEquipment: IFarmEquipment,
  date: number
) {
  const wateredSoilMap = getSoilMap(farmEquipment, date);

  const tileOffset = 4 * 16;

  forEachTileInMap(wateredSoilMap, (tileValue, tileIndex, x, y) => {
    context.drawImage(
      tileset,
      (flooringTileMap[tileIndex] % 4) * 16 + tileOffset,
      Math.floor(flooringTileMap[tileIndex] / 4) * 16,
      16,
      16,
      x * 16,
      y * 16,
      16,
      16
    );
  });
}

export function renderFlooringToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  farmItems: IFarmEquipment,
  date: number
) {
  const flooringMap = getFlooringMap(farmItems, date);

  forEachTileInMap(flooringMap, (tileValue, tileIndex, x, y) => {
    context.drawImage(
      tileset,
      (flooringTileMap[tileIndex] % 4) * 16 + (tileValue % 4) * 64,
      Math.floor(flooringTileMap[tileIndex] / 4) * 16 +
        Math.floor(tileValue / 4) * 64,
      16,
      16,
      x * 16,
      y * 16,
      16,
      16
    );
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
        plantedCropDetails.id,
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
  isFlower?: boolean
) {
  const cropIds = Object.keys(crops).sort((a, b) => a.localeCompare(b));

  context.drawImage(
    sprite,
    spriteIndex * 16,
    cropIds.indexOf(id) * 32,
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
      cropIds.indexOf(id) * 32,
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
  installedEquipment: IInstalledEquipment,
  date: number
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

      if (equipment[id].isSeasonal) {
        return acc + equipment[id].skins.length * 4;
      }

      return acc + equipment[id].skins.length;
    }, 0);

  if (equipment[equipmentId].isSeasonal) {
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

    forEachTileInRegion(highlightedRegion, (x, y) => {
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

    forEachTileInRegion(highlightedRegion, (x, y) => {
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
      forEachTileInRegion(highlightedRegion, (x, y) => {
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
