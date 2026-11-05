import { items } from "../data/game/items.json";
import { drawSprite } from "./atlas";
import { getSeason } from "./date";
import { getFlooringMap } from "./farm";
import { hashFloorVariant } from "./floorVariant";
import { getItemSkin } from "./items";
import { getSilhouette } from "./silhouette";

type TFloorImage = HTMLCanvasElement | HTMLImageElement;

type TSide = keyof IFloorNeighbours;

interface IFloorImages {
  flooring: TFloorImage;
  flooringWinter: TFloorImage;
}

interface IMapSize {
  height: number;
  width: number;
}

interface IFloorTile {
  block: TSpriteRect;
  floor: IFloorSkin;
  image: TFloorImage;
  mask: number;
  sprite: TSpriteRect;
  x: number;
  y: number;
}

const sideOffsets: Record<TSide, TTileOffset> = {
  e: [1, 0],
  n: [0, -1],
  ne: [1, -1],
  nw: [-1, -1],
  s: [0, 1],
  se: [1, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

const cardinalSides: TSide[] = ["e", "n", "s", "w"];

const allSides: TSide[] = [...cardinalSides, "ne", "nw", "se", "sw"];

const corners: (keyof IFloorCorners<unknown>)[] = ["ne", "nw", "se", "sw"];

function isOffMap(x: number, y: number, mapSize: IMapSize) {
  return x < 0 || y < 0 || x >= mapSize.width || y >= mapSize.height;
}

function hasSide(drawing: IFloorDrawing, mask: number, side: TSide) {
  return (mask & drawing.neighbours[side]) !== 0;
}

function getFloorIdMap(flooringMap: IInstalledEquipment[][]) {
  const floorIdMap: (string | undefined)[][] = [];

  flooringMap.forEach((column, x) => {
    floorIdMap[x] = column.map(
      ({ equipmentId, skin }) => getItemSkin(equipmentId, skin)?.floor?.id,
    );
  });

  return floorIdMap;
}

// SV › Flooring.gatherNeighbors: a tile off the map counts as a neighbour.
function getNeighbourMask(
  drawing: IFloorDrawing,
  floorIdMap: (string | undefined)[][],
  cell: IInstalledEquipment,
  floorId: string,
  mapSize: IMapSize,
) {
  return allSides.reduce((mask, side) => {
    const x = cell.x + sideOffsets[side][0];
    const y = cell.y + sideOffsets[side][1];
    const isNeighbour =
      isOffMap(x, y, mapSize) || floorIdMap[x]?.[y] === floorId;

    return isNeighbour ? mask + drawing.neighbours[side] : mask;
  }, 0);
}

function getTileIndex(
  drawing: IFloorDrawing,
  floor: IFloorSkin,
  cell: IInstalledEquipment,
  mask: number,
) {
  if (floor.connectType === "Random") {
    const variant = cell.variant ?? hashFloorVariant(cell.x, cell.y);

    return drawing.variants.at(variant) ?? 0;
  }

  const cardinalMask = cardinalSides.reduce(
    (sum, side) => sum + (mask & drawing.neighbours[side]),
    0,
  );

  return drawing.drawGuide[String(cardinalMask)] ?? 0;
}

function getFloorTiles(
  drawing: IFloorDrawing,
  images: IFloorImages,
  farmItems: IFarmEquipment,
  date: number,
  mapSize: IMapSize,
) {
  const isWinter = getSeason(date) === 3;
  const flooringMap = getFlooringMap(farmItems, date);
  const floorIdMap = getFloorIdMap(flooringMap);
  const { tilesPerRow, tileSize } = drawing;
  const tiles: IFloorTile[] = [];

  flooringMap.forEach((column) => {
    column.forEach((cell) => {
      const floor = getItemSkin(cell.equipmentId, cell.skin)?.floor;

      if (floor === undefined) {
        return;
      }

      const mask = getNeighbourMask(
        drawing,
        floorIdMap,
        cell,
        floor.id,
        mapSize,
      );
      const tile = getTileIndex(drawing, floor, cell, mask);
      const winterBlock = isWinter ? floor.winterBlock : undefined;
      const block = winterBlock ?? floor.block;

      tiles.push({
        block,
        floor,
        image:
          winterBlock === undefined ? images.flooring : images.flooringWinter,
        mask,
        sprite: [
          block[0] + (tile % tilesPerRow) * tileSize,
          block[1] + Math.floor(tile / tilesPerRow) * tileSize,
          tileSize,
          tileSize,
        ],
        x: cell.x,
        y: cell.y,
      });
    });
  });

  return tiles;
}

function renderShadows(
  context: CanvasRenderingContext2D,
  drawing: IFloorDrawing,
  tiles: IFloorTile[],
) {
  const [offsetX, offsetY] = drawing.shadow.offset;

  context.save();
  context.globalAlpha = drawing.shadow.opacity;
  context.fillStyle = "#000000";

  tiles.forEach(({ floor, image, sprite, x, y }) => {
    const left = x * 16 + offsetX;
    const top = y * 16 + offsetY;

    if (floor.shadowType === "Square") {
      context.fillRect(left, top, drawing.tileSize, drawing.tileSize);
    }

    if (floor.shadowType === "Contoured") {
      const silhouette = getSilhouette(image);

      if (silhouette !== undefined) {
        drawSprite(context, silhouette, sprite, left, top);
      }
    }
  });

  context.restore();
}

function renderTiles(context: CanvasRenderingContext2D, tiles: IFloorTile[]) {
  tiles.forEach(({ image, sprite, x, y }) => {
    drawSprite(context, image, sprite, x * 16, y * 16);
  });
}

function renderCornerPatches(
  context: CanvasRenderingContext2D,
  drawing: IFloorDrawing,
  tiles: IFloorTile[],
) {
  tiles.forEach(({ block, floor, image, mask, x, y }) => {
    corners.forEach((corner) => {
      const patch = floor.corners?.[corner];
      const { empty, needs } = drawing.corners[corner];

      if (
        patch === undefined ||
        !needs.every((side) => hasSide(drawing, mask, side)) ||
        hasSide(drawing, mask, empty)
      ) {
        return;
      }

      const [sourceX, sourceY, width, height] = patch.source;

      drawSprite(
        context,
        image,
        [block[0] + sourceX, block[1] + sourceY, width, height],
        x * 16 + patch.at[0],
        y * 16 + patch.at[1],
      );
    });
  });
}

// The game sorts floors by depth, so every shadow is under every tile and
// every corner patch is over every tile (SV › Flooring.draw).
export function renderFloorsToContext(
  context: CanvasRenderingContext2D,
  images: IFloorImages,
  farmItems: IFarmEquipment,
  date: number,
  mapSize: IMapSize,
) {
  const { floorDrawing: drawing } = items.flooring;

  if (drawing === undefined) {
    return;
  }

  const tiles = getFloorTiles(drawing, images, farmItems, date, mapSize);

  renderShadows(context, drawing, tiles);
  renderTiles(context, tiles);
  renderCornerPatches(context, drawing, tiles);
}
