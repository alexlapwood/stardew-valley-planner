import { getScarecrowMap, getSoilMap } from "./farm";

interface INeighbours {
  e: boolean;
  n: boolean;
  s: boolean;
  w: boolean;
}

const soilTileMap = [0, 12, 15, 11, 13, 9, 14, 10, 4, 8, 3, 7, 1, 5, 2, 6];

function forEachTileInMap<T extends number | string>(
  tileMap: (T | undefined)[][],
  callBack: (
    tileValue: T,
    neighbours: INeighbours,
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

      callBack(
        cellValue,
        {
          e: tileMap[ix + 1] !== undefined && tileMap[ix + 1][iy] === cellValue,
          n: row[iy - 1] === cellValue,
          s: row[iy + 1] === cellValue,
          w: tileMap[ix - 1] !== undefined && tileMap[ix - 1][iy] === cellValue,
        },
        ix,
        iy,
      );
    });
  });
}

function getSoilTile({ e, n, s, w }: INeighbours) {
  return soilTileMap[+n + 2 * +w + 4 * +e + 8 * +s];
}

export function renderSoilToContext(
  context: CanvasRenderingContext2D,
  tileset: CanvasImageSource,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  farmMap: IFarmMap,
  date: number,
) {
  const soilMap = getSoilMap(farmItems, date, farmMap);

  forEachTileInMap(soilMap, (tileValue, neighbours, x, y) => {
    const tile = getSoilTile(neighbours);

    context.drawImage(
      tileset,
      (tile % 4) * 16,
      Math.floor(tile / 4) * 16,
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
  tileset: CanvasImageSource,
  farmEquipment: IFarmEquipment,
  farmMap: IFarmMap,
  date: number,
) {
  const wateredSoilMap = getSoilMap(farmEquipment, date, farmMap);

  const tileOffset = 4 * 16;

  forEachTileInMap(wateredSoilMap, (tileValue, neighbours, x, y) => {
    const tile = getSoilTile(neighbours);

    context.drawImage(
      tileset,
      (tile % 4) * 16 + tileOffset,
      Math.floor(tile / 4) * 16,
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
  tileset: CanvasImageSource,
  farmEquipment: IFarmEquipment,
  farmMap: IFarmMap,
  date: number,
) {
  const scarecrowProtectedSoilMap = getScarecrowMap(
    farmEquipment,
    date,
    farmMap,
  );

  forEachTileInMap(scarecrowProtectedSoilMap, (tileValue, neighbours, x, y) => {
    context.drawImage(tileset, 0, 0, 16, 16, x * 16, y * 16, 16, 16);
  });
}
