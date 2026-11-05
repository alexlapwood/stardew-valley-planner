import { items } from "../data/game/items.json";
import { getSeason } from "./date";
import { getFlooringMap, getScarecrowMap, getSoilMap } from "./farm";
import { getItemSkin } from "./items";

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
  currentFarm: string[],
  date: number,
) {
  const soilMap = getSoilMap(farmItems, date, currentFarm);

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
  currentFarm: string[],
  date: number,
) {
  const wateredSoilMap = getSoilMap(farmEquipment, date, currentFarm);

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
  currentFarm: string[],
  date: number,
) {
  const scarecrowProtectedSoilMap = getScarecrowMap(
    farmEquipment,
    date,
    currentFarm,
  );

  forEachTileInMap(scarecrowProtectedSoilMap, (tileValue, neighbours, x, y) => {
    context.drawImage(tileset, 0, 0, 16, 16, x * 16, y * 16, 16, 16);
  });
}

export function renderFlooringToContext(
  context: CanvasRenderingContext2D,
  tilesets: { flooring: CanvasImageSource; flooringWinter: CanvasImageSource },
  farmItems: IFarmEquipment,
  date: number,
) {
  const { floorDrawing } = items.flooring;

  if (floorDrawing === undefined) {
    return;
  }

  const isWinter = getSeason(date) === 3;
  const flooringMap = getFlooringMap(farmItems, date);

  forEachTileInMap(flooringMap, (skin, neighbours, x, y) => {
    const floor = getItemSkin("flooring", skin)?.floor;

    if (floor === undefined) {
      return;
    }

    const mask =
      floorDrawing.neighbours.n * +neighbours.n +
      floorDrawing.neighbours.e * +neighbours.e +
      floorDrawing.neighbours.s * +neighbours.s +
      floorDrawing.neighbours.w * +neighbours.w;
    const tile = floorDrawing.drawGuide[String(mask)] ?? 0;
    const winterBlock = isWinter ? floor.winterBlock : undefined;
    const [blockX, blockY] = winterBlock ?? floor.block;
    const { tilesPerRow, tileSize } = floorDrawing;

    context.drawImage(
      winterBlock === undefined ? tilesets.flooring : tilesets.flooringWinter,
      blockX + (tile % tilesPerRow) * tileSize,
      blockY + Math.floor(tile / tilesPerRow) * tileSize,
      tileSize,
      tileSize,
      x * 16,
      y * 16,
      tileSize,
      tileSize,
    );
  });
}
