import { equipmentForRegion } from "./equipmentPlacement";
import {
  forEachTileInRegion,
  getCropsAtLocation,
  getEquipmentAtLocation,
} from "./farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  findCropToDestroy,
  findEquipmentToDestroy,
} from "./itemPlacement";
import { previewTreesToPlant, treesForRegion } from "./treePlacement";

export interface IHighlightImages {
  amber: HTMLImageElement;
  blockerOutline: HTMLImageElement;
  green: HTMLImageElement;
  grey: HTMLImageElement;
  red: HTMLImageElement;
}

function highlightTiles(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tiles: readonly { x: number; y: number }[],
) {
  tiles.forEach(({ x, y }) => {
    context.drawImage(image, x * 16, y * 16);
  });
}

export function renderSelectedRegion(
  context: CanvasRenderingContext2D,
  currentCrops: IFarmCrops,
  currentEquipment: IFarmEquipment,
  farmMap: IFarmMap,
  date: number,
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  images: IHighlightImages,
  selectedItem: ISelectedItem,
) {
  if (selectedItem.type === "crop") {
    const cropsToPlant: IPlantedCrop[] = [];

    forEachTileInRegion(highlightedRegion, (x, y) => {
      cropsToPlant.push({
        cropId: selectedItem.id,
        datePlanted: date,
        type: "crop",
        x,
        y,
      });
    });

    const { plantableCrops, unplantableCrops } = checkCropsToPlant(
      cropsToPlant,
      { currentCrops, currentEquipment },
      farmMap,
    );

    highlightTiles(context, images.green, plantableCrops);
    highlightTiles(context, images.red, unplantableCrops);
  }

  if (selectedItem.type === "tree") {
    const { blockedTrees, blockerTiles, freeTrees, unplantableTrees } =
      previewTreesToPlant(
        treesForRegion(selectedItem.id, highlightedRegion, date),
        { currentCrops, currentEquipment },
        farmMap,
      );

    highlightTiles(context, images.green, freeTrees);
    highlightTiles(context, images.amber, blockedTrees);
    highlightTiles(context, images.red, unplantableTrees);
    highlightTiles(context, images.blockerOutline, blockerTiles);
  }

  if (selectedItem.type === "equipment") {
    const equipmentToInstallList = equipmentForRegion(
      selectedItem,
      highlightedRegion,
      date,
    );

    const { installableEquipment, notInstallableEquipment } =
      checkEquipmentToInstall(
        equipmentToInstallList,
        {
          currentCrops,
          currentEquipment,
        },
        farmMap,
      );

    highlightTiles(context, images.green, installableEquipment);
    highlightTiles(context, images.red, notInstallableEquipment);
  }

  if (selectedItem.type === "tool") {
    if (selectedItem.id === "pick-axe") {
      forEachTileInRegion(highlightedRegion, (x, y) => {
        const plantedCrops = getCropsAtLocation(currentCrops, x, y);
        const installedEquipment = getEquipmentAtLocation(
          currentEquipment,
          x,
          y,
        );

        const hasCropToDestroy = findCropToDestroy(plantedCrops, date);

        const hasEquipmentToDestroy = findEquipmentToDestroy(
          installedEquipment,
          date,
        );

        if (hasCropToDestroy || hasEquipmentToDestroy) {
          context.drawImage(images.red, x * 16, y * 16);
        } else {
          context.drawImage(images.grey, x * 16, y * 16);
        }
      });
    }
  }
}
