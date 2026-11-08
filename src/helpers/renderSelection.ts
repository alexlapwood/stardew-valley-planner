import type { IBuildingCheck } from "./buildingPlacement";
import type { IDragRegion } from "./dragPlacement";
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
  type ICurrentItems,
} from "./itemPlacement";
import { getFootprintTiles } from "./plannedBuildings";
import { planRegionErase } from "./regionErase";
import { previewTreesToPlant, treesForRegion } from "./treePlacement";

export interface IHighlightImages {
  amber: HTMLImageElement;
  blockerOutline: HTMLImageElement;
  green: HTMLImageElement;
  grey: HTMLImageElement;
  red: HTMLImageElement;
}

const tileKey = ({ x, y }: IFarmTile) => `${x},${y}`;

function highlightTiles(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tiles: readonly { x: number; y: number }[],
) {
  tiles.forEach(({ x, y }) => {
    context.drawImage(image, x * 16, y * 16);
  });
}

// A building or a bush goes as a whole, so the erase shows all of its tiles,
// also the tiles out of the region. backTiles are the tiles of the bushes that
// come back. The preview plans the whole erase, because whether a bush comes
// back depends on the things that the same erase takes off its tiles.
function getWholeEraseTiles(
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  date: number,
  highlightedRegion: IDragRegion,
) {
  const { bushes, erasedBuildings, fixed } = planRegionErase(
    currentItems,
    farmMap,
    highlightedRegion,
    date,
  );

  return {
    backTiles: bushes.backTiles,
    erasedTiles: [
      ...erasedBuildings.flatMap(getFootprintTiles),
      ...fixed.tiles,
      ...bushes.cutTiles,
    ],
  };
}

// The tiles of the buildings and the bushes that the erase changes go over the
// sprites, so the region leaves those tiles empty here.
function renderErase(
  context: CanvasRenderingContext2D,
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  date: number,
  highlightedRegion: IDragRegion,
  images: IHighlightImages,
) {
  const { currentCrops, currentEquipment } = currentItems;
  const { backTiles, erasedTiles } = getWholeEraseTiles(
    currentItems,
    farmMap,
    date,
    highlightedRegion,
  );
  const wholeTiles = new Set([...erasedTiles, ...backTiles].map(tileKey));

  forEachTileInRegion(highlightedRegion, (x, y) => {
    if (wholeTiles.has(tileKey({ x, y }))) {
      return;
    }

    const hasCropToDestroy = findCropToDestroy(
      getCropsAtLocation(currentCrops, x, y),
      date,
    );
    const hasEquipmentToDestroy = findEquipmentToDestroy(
      getEquipmentAtLocation(currentEquipment, x, y),
      date,
    );

    if (hasCropToDestroy || hasEquipmentToDestroy) {
      context.drawImage(images.red, x * 16, y * 16);
    } else {
      context.drawImage(images.grey, x * 16, y * 16);
    }
  });
}

export function renderSelectedRegion(
  context: CanvasRenderingContext2D,
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  date: number,
  highlightedRegion: IDragRegion,
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
      currentItems,
      farmMap,
    );

    highlightTiles(context, images.green, plantableCrops);
    highlightTiles(context, images.red, unplantableCrops);
  }

  if (selectedItem.type === "tree") {
    const { blockedTrees, blockerTiles, freeTrees, unplantableTrees } =
      previewTreesToPlant(
        treesForRegion(selectedItem.id, highlightedRegion, date),
        currentItems,
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
      checkEquipmentToInstall(equipmentToInstallList, currentItems, farmMap);

    highlightTiles(context, images.green, installableEquipment);
    highlightTiles(context, images.red, notInstallableEquipment);
  }

  if (selectedItem.type === "tool" && selectedItem.id === "pick-axe") {
    renderErase(
      context,
      currentItems,
      farmMap,
      date,
      highlightedRegion,
      images,
    );
  }
}

// A building sprite hides its own footprint, so the tiles of a building go
// over all the sprites, as in the game.
export function renderBuildingSelection(
  context: CanvasRenderingContext2D,
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
  date: number,
  highlightedRegion: IDragRegion,
  images: IHighlightImages,
  selectedItem: ISelectedItem,
  buildingCheck: IBuildingCheck | undefined,
) {
  if (buildingCheck !== undefined) {
    highlightTiles(context, images.green, buildingCheck.freeTiles);
    highlightTiles(context, images.red, buildingCheck.blockedTiles);
  }

  if (selectedItem.type === "tool" && selectedItem.id === "pick-axe") {
    const { backTiles, erasedTiles } = getWholeEraseTiles(
      currentItems,
      farmMap,
      date,
      highlightedRegion,
    );

    highlightTiles(context, images.red, erasedTiles);
    highlightTiles(context, images.green, backTiles);
  }
}
