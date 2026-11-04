import { mergeDeep } from "immutable";

import { farmLayouts } from "../../data/sdv.json";
import { getSeason } from "../../helpers/date";
import { forEachTileInRegion } from "../../helpers/farm";
import { checkEquipmentToInstall } from "../../helpers/itemPlacement";
import { renderItemsToContext } from "../../helpers/renderItems";
import { renderSelectedRegion } from "../../helpers/renderSelection";
import {
  renderFlooringToContext,
  renderScarecrowProtectionToContext,
  renderSoilToContext,
  renderWateredSoilToContext,
} from "../../helpers/renderTileMaps";

export interface IRegion {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

interface IFarmCanvasState {
  crops: IFarmCrops;
  currentFarm: string;
  date: number;
  equipment: IFarmEquipment;
  highlightedRegion?: IRegion;
  images: HTMLImageElement[];
  selectedItem?: ISelectedItem;
}

function findImage(images: HTMLImageElement[], path: string) {
  const image = images.find((candidate) => candidate.src.includes(path));

  if (image === undefined) {
    throw new Error("Error loading images");
  }

  return image;
}

function getPotentialEquipment(
  highlightedRegion: IRegion | undefined,
  selectedItem: ISelectedItem | undefined,
  date: number,
  currentItems: { currentCrops: IFarmCrops; currentEquipment: IFarmEquipment },
  farmLayout: string[],
) {
  if (
    highlightedRegion === undefined ||
    selectedItem === undefined ||
    selectedItem.type !== "equipment"
  ) {
    return undefined;
  }

  const equipmentToInstallList: IInstalledEquipment[] = [];
  forEachTileInRegion(highlightedRegion, (x, y) => {
    equipmentToInstallList.push({
      dateInstalled: date,
      equipmentId: selectedItem.id,
      skinIndex: selectedItem.skinIndex ?? 0,
      type: "equipment",
      x,
      y,
    });
  });

  const { installableEquipment } = checkEquipmentToInstall(
    equipmentToInstallList,
    currentItems,
    farmLayout,
  );

  let newEquipment: IFarmEquipment = {};

  installableEquipment.forEach((equipmentToInstall) => {
    newEquipment = mergeDeep(newEquipment, {
      [equipmentToInstall.y]: {
        [equipmentToInstall.x]: [equipmentToInstall],
      },
    });
  });

  return newEquipment;
}

export function drawFarm(canvas: HTMLCanvasElement, state: IFarmCanvasState) {
  const { crops, currentFarm, date, equipment, highlightedRegion } = state;
  const canvasHeight = canvas.height;
  const canvasWidth = canvas.width;
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not get context for canvas");
  }

  context.imageSmoothingEnabled = false;

  const season = ["spring", "summer", "fall", "winter"][getSeason(date)];
  const farmImageName =
    currentFarm === "Test" ? "standard" : currentFarm.toLowerCase();
  const farmLayout = farmLayouts[currentFarm.toLowerCase()];

  const images = {
    background: findImage(
      state.images,
      `/images/${farmImageName}-${season}.png`,
    ),
    crops: findImage(state.images, "/images/crops.png"),
    equipment: findImage(state.images, "/images/equipment-sheet.png"),
    fence: findImage(state.images, "/images/fences.png"),
    flooring: findImage(state.images, "/images/flooring.png"),
    highlightGreen: findImage(state.images, "/images/highlight-green.png"),
    highlightGrey: findImage(state.images, "/images/highlight-grey.png"),
    highlightRed: findImage(state.images, "/images/highlight-red.png"),
    hoeDirt: findImage(state.images, "/images/hoeDirt.png"),
    hoeDirtSnow: findImage(state.images, "/images/hoeDirtSnow.png"),
  };

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  context.drawImage(images.background, 0, 0);

  const potentialEquipment =
    getPotentialEquipment(
      highlightedRegion,
      state.selectedItem,
      date,
      { currentCrops: crops, currentEquipment: equipment },
      farmLayout,
    ) ?? {};

  renderSoilToContext(
    context,
    season === "winter" ? images.hoeDirtSnow : images.hoeDirt,
    mergeDeep(crops, equipment, potentialEquipment),
    farmLayout,
    date,
  );

  renderWateredSoilToContext(
    context,
    season === "winter" ? images.hoeDirtSnow : images.hoeDirt,
    mergeDeep(equipment, potentialEquipment),
    farmLayout,
    date,
  );

  renderFlooringToContext(
    context,
    images.flooring,
    mergeDeep(equipment, potentialEquipment),
    date,
  );

  renderScarecrowProtectionToContext(
    context,
    images.highlightGreen,
    mergeDeep(equipment, potentialEquipment),
    farmLayout,
    date,
  );

  if (highlightedRegion !== undefined && state.selectedItem !== undefined) {
    renderSelectedRegion(
      context,
      crops,
      equipment,
      farmLayout,
      date,
      highlightedRegion,
      images.highlightGreen,
      images.highlightGrey,
      images.highlightRed,
      state.selectedItem,
    );
  }

  renderItemsToContext(
    context,
    images.crops,
    images.equipment,
    images.fence,
    mergeDeep(crops, equipment, potentialEquipment),
    date,
  );
}
