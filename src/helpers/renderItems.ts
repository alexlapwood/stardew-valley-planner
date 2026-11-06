import { crops } from "../data/game/crops.json";
import { drawSprite, drawSpriteFlipped, drawSpriteOnTile } from "./atlas";
import { getCropSprites } from "./crop";
import { getSeasonName } from "./date";
import {
  forEachFarmItem,
  getFenceMap,
  isCropHereToday,
  isEquipmentHereToday,
} from "./farm";
import { getItem, getItemSkin, getSkinSprite } from "./items";
import { renderFenceToContext } from "./renderFences";
import type { ISortedDraw } from "./renderSorted";
import { getTreeTallSprite, type ITallSprite } from "./tallSprites";
import {
  getPlantedTreeLook,
  isTreeHereToday,
  type ITreeLook,
  type ITreeSchedule,
  type ITreeSprite,
} from "./tree";

interface IItemImages {
  crops: CanvasImageSource;
  fences: CanvasImageSource;
  items: CanvasImageSource;
  trees: CanvasImageSource;
}

type TItemDraw = Pick<ISortedDraw, "draw" | "tall">;

export type TGetTreeSchedule = (plantedTree: IPlantedTree) => ITreeSchedule;

function getTreeSpriteOrigin({ x, y }: IPlantedTree, { offset }: ITreeSprite) {
  return { x: x * 16 + offset.x, y: y * 16 + offset.y };
}

// A young tree is a small plant in a big frame, so only a mature tree fades,
// as in the game.
function getMatureTreeTallSprite(
  plantedTree: IPlantedTree,
  { isMature, sprite }: ITreeLook,
): ITallSprite | undefined {
  if (!isMature) {
    return undefined;
  }

  const [, , width, height] = sprite.rect;

  return getTreeTallSprite(plantedTree.y, {
    height,
    width,
    ...getTreeSpriteOrigin(plantedTree, sprite),
  });
}

function getTreeDraw(
  context: CanvasRenderingContext2D,
  treesImage: CanvasImageSource,
  plantedTree: IPlantedTree,
  schedule: ITreeSchedule,
  date: number,
): TItemDraw | undefined {
  const look = getPlantedTreeLook(plantedTree, schedule, date);

  if (look === undefined) {
    return undefined;
  }

  return {
    draw: () => {
      renderTreeToContext(context, treesImage, plantedTree, look);
    },
    tall: getMatureTreeTallSprite(plantedTree, look),
  };
}

function getItemDraw(
  context: CanvasRenderingContext2D,
  images: IItemImages,
  farmItem: TFarmItem,
  fenceMap: string[][],
  date: number,
  getTreeSchedule: TGetTreeSchedule,
): TItemDraw | undefined {
  if (farmItem.type === "crop") {
    return isCropHereToday(farmItem, date)
      ? {
          draw: () => {
            renderCropToContext(context, images.crops, farmItem, date);
          },
        }
      : undefined;
  }

  if (farmItem.type === "tree") {
    return isTreeHereToday(farmItem, date)
      ? getTreeDraw(
          context,
          images.trees,
          farmItem,
          getTreeSchedule(farmItem),
          date,
        )
      : undefined;
  }

  if (!isEquipmentHereToday(farmItem, date)) {
    return undefined;
  }

  const kind = getItem(farmItem.equipmentId)?.kind;

  if (kind === "fence") {
    return {
      draw: () => {
        renderFenceToContext(context, images.fences, farmItem, fenceMap);
      },
    };
  }

  return kind === "floor"
    ? undefined
    : {
        draw: () => {
          renderEquipmentToContext(context, images.items, farmItem, date);
        },
      };
}

export function getItemDraws(
  context: CanvasRenderingContext2D,
  images: IItemImages,
  farmItems: IFarmItems<TFarmItem[]>,
  date: number,
  getTreeSchedule: TGetTreeSchedule,
) {
  const fenceMap = getFenceMap(farmItems, date);
  const draws: ISortedDraw[] = [];

  forEachFarmItem<TFarmItem>(farmItems, (farmItem) => {
    const itemDraw = getItemDraw(
      context,
      images,
      farmItem,
      fenceMap,
      date,
      getTreeSchedule,
    );

    if (itemDraw !== undefined) {
      draws.push({ ...itemDraw, layer: "item", row: farmItem.y });
    }
  });

  return draws;
}

export function renderCropToContext(
  context: CanvasRenderingContext2D,
  cropsImage: CanvasImageSource,
  plantedCrop: IPlantedCrop,
  date: number,
) {
  const { cropId, datePlanted, x, y } = plantedCrop;

  getCropSprites(
    crops[cropId],
    date - datePlanted,
    x,
    y,
    getSeasonName(date),
  ).forEach((rect) => {
    drawSpriteOnTile(context, cropsImage, rect, x, y);
  });
}

// The canvas has 1 pixel for each sprite pixel and cannot show the fraction of
// a spot shift, so a rounded spot keeps the fruit sharp.
function renderFruitToContext(
  context: CanvasRenderingContext2D,
  treesImage: CanvasImageSource,
  { x, y }: IPlantedTree,
  { fruit, fruitRect }: ITreeLook,
) {
  fruit.forEach((spot) => {
    const drawFruit = spot.flipped ? drawSpriteFlipped : drawSprite;

    drawFruit(
      context,
      treesImage,
      fruitRect,
      Math.round(x * 16 + spot.x),
      Math.round(y * 16 + spot.y),
    );
  });
}

export function renderTreeToContext(
  context: CanvasRenderingContext2D,
  treesImage: CanvasImageSource,
  plantedTree: IPlantedTree,
  look: ITreeLook,
) {
  const origin = getTreeSpriteOrigin(plantedTree, look.sprite);

  drawSprite(context, treesImage, look.sprite.rect, origin.x, origin.y);
  renderFruitToContext(context, treesImage, plantedTree, look);
}

export function renderEquipmentToContext(
  context: CanvasRenderingContext2D,
  itemsImage: CanvasImageSource,
  installedEquipment: IInstalledEquipment,
  date: number,
) {
  const { equipmentId, skin, x, y } = installedEquipment;
  const itemSkin = getItemSkin(equipmentId, skin);
  const rect =
    itemSkin === undefined
      ? undefined
      : getSkinSprite(itemSkin, getSeasonName(date));

  if (rect !== undefined) {
    drawSpriteOnTile(context, itemsImage, rect, x, y);
  }
}
