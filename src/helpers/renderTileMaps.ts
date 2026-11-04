import { getFlooringMap, getScarecrowMap, getSoilMap } from "./farm";

const flooringTileMap = [0, 12, 15, 11, 13, 9, 14, 10, 4, 8, 3, 7, 1, 5, 2, 6];

function forEachTileInMap(
  tileMap: (number | undefined)[][],
  callBack: (
    tileValue: number,
    tileIndex: number,
    x: number,
    y: number,
  ) => void,
) {
  tileMap.forEach((row, ix) => {
    row.forEach((cellValue, iy) => {
      // getSoilMap sets the soil under equipment to undefined to remove it
      if (cellValue === undefined) {
        return;
      }

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
  currentFarm: string[],
  date: number,
) {
  const soilMap = getSoilMap(farmItems, date, currentFarm);

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
      16,
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
  currentFarm: string[],
  date: number,
) {
  const wateredSoilMap = getSoilMap(farmEquipment, date, currentFarm);

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
      16,
    );
  });
}

export function renderScarecrowProtectionToContext(
  context: CanvasRenderingContext2D,
  tileset:
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap,
  farmEquipment: IFarmEquipment,
  currentFarm: string[],
  date: number,
) {
  const scarecrowProtectedSoilMap = getScarecrowMap(
    farmEquipment,
    date,
    currentFarm,
  );

  forEachTileInMap(scarecrowProtectedSoilMap, (tileValue, tileIndex, x, y) => {
    context.drawImage(tileset, 0, 0, 16, 16, x * 16, y * 16, 16, 16);
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
  date: number,
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
      16,
    );
  });
}
