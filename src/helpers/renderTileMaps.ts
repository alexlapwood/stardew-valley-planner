import { getSoilMap, getWateredSoilMap } from "./farm";

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
      // The soil maps set the soil under equipment and trees to undefined to
      // remove it
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
  farmItems: IFarmItems<TFarmItem[]>,
  farmMap: IFarmMap,
  date: number,
  buildings: readonly IPlannedBuilding[],
  cutBushes?: readonly ICutBush[],
) {
  const soilMap = getSoilMap(farmItems, date, farmMap, buildings, cutBushes);

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
  farmItems: IFarmItems<TFarmItem[]>,
  farmMap: IFarmMap,
  date: number,
  buildings: readonly IPlannedBuilding[],
  cutBushes?: readonly ICutBush[],
) {
  const wateredSoilMap = getWateredSoilMap(
    farmItems,
    date,
    farmMap,
    buildings,
    cutBushes,
  );

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

export interface ICropAreaImages {
  green: CanvasImageSource;
  lime: CanvasImageSource;
  yellow: CanvasImageSource;
}

export interface ICropAreaMaps {
  junimo: (number | undefined)[][];
  scarecrow: (number | undefined)[][];
}

function drawAreaTile(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
) {
  context.drawImage(image, 0, 0, 16, 16, x * 16, y * 16, 16, 16);
}

// A tile in both areas gets 1 tile of the mixed colour. 2 tiles on top of each
// other would be darker than the tiles around them.
export function renderCropAreasToContext(
  context: CanvasRenderingContext2D,
  images: ICropAreaImages,
  { junimo, scarecrow }: ICropAreaMaps,
) {
  forEachTileInMap(scarecrow, (tileValue, neighbours, x, y) => {
    drawAreaTile(
      context,
      junimo[x]?.[y] === undefined ? images.yellow : images.lime,
      x,
      y,
    );
  });

  forEachTileInMap(junimo, (tileValue, neighbours, x, y) => {
    if (scarecrow[x]?.[y] === undefined) {
      drawAreaTile(context, images.green, x, y);
    }
  });
}
