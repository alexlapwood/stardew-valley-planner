import { crops } from "../data/game/crops.json";
import { drawSpriteOnTile } from "./atlas";
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

interface IItemImages {
  crops: CanvasImageSource;
  fences: CanvasImageSource;
  items: CanvasImageSource;
}

function getItemDraw(
  context: CanvasRenderingContext2D,
  images: IItemImages,
  farmItem: IPlantedCrop | IInstalledEquipment,
  fenceMap: string[][],
  date: number,
) {
  if (farmItem.type === "crop") {
    return isCropHereToday(farmItem, date)
      ? () => {
          renderCropToContext(context, images.crops, farmItem, date);
        }
      : undefined;
  }

  if (!isEquipmentHereToday(farmItem, date)) {
    return undefined;
  }

  const kind = getItem(farmItem.equipmentId)?.kind;

  if (kind === "fence") {
    return () => {
      renderFenceToContext(context, images.fences, farmItem, fenceMap);
    };
  }

  return kind === "floor"
    ? undefined
    : () => {
        renderEquipmentToContext(context, images.items, farmItem, date);
      };
}

export function getItemDraws(
  context: CanvasRenderingContext2D,
  images: IItemImages,
  farmItems: IFarmItems<Array<IPlantedCrop | IInstalledEquipment>>,
  date: number,
) {
  const fenceMap = getFenceMap(farmItems, date);
  const draws: ISortedDraw[] = [];

  forEachFarmItem<IPlantedCrop | IInstalledEquipment>(farmItems, (farmItem) => {
    const draw = getItemDraw(context, images, farmItem, fenceMap, date);

    if (draw !== undefined) {
      draws.push({ draw, layer: "item", row: farmItem.y });
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
