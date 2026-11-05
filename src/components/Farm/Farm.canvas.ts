import { mergeDeep } from "immutable";

import { farmLayouts } from "../../data/sdv.json";
import { findAtlas, findImage } from "../../helpers/atlas";
import { getSeasonName } from "../../helpers/date";
import {
  equipmentForRegion,
  installableEquipmentByTile,
} from "../../helpers/equipmentPlacement";
import type { TPickFloorVariant } from "../../helpers/floorVariant";
import { renderFloorsToContext } from "../../helpers/renderFloors";
import { renderItemsToContext } from "../../helpers/renderItems";
import { renderSelectedRegion } from "../../helpers/renderSelection";
import {
  renderScarecrowProtectionToContext,
  renderSoilToContext,
  renderWateredSoilToContext,
} from "../../helpers/renderTileMaps";
import type { IRegion } from "./Farm.region";

interface IFarmCanvasState {
  crops: IFarmCrops;
  currentFarm: string;
  date: number;
  equipment: IFarmEquipment;
  highlightedRegion?: IRegion;
  images: HTMLImageElement[];
  pickFloorVariant: TPickFloorVariant;
  selectedItem?: ISelectedItem;
}

function getPotentialEquipment(state: IFarmCanvasState, farmLayout: string[]) {
  const { crops, date, equipment, highlightedRegion, selectedItem } = state;

  if (
    highlightedRegion === undefined ||
    selectedItem === undefined ||
    selectedItem.type !== "equipment"
  ) {
    return undefined;
  }

  return installableEquipmentByTile(
    equipmentForRegion(
      selectedItem,
      highlightedRegion,
      date,
      state.pickFloorVariant,
    ),
    { currentCrops: crops, currentEquipment: equipment },
    farmLayout,
  );
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

  const season = getSeasonName(date);
  const farmImageName =
    currentFarm === "Test" ? "standard" : currentFarm.toLowerCase();
  const farmLayout = farmLayouts[currentFarm.toLowerCase()];

  const images = {
    background: findImage(
      state.images,
      `/images/${farmImageName}-${season}.png`,
    ),
    crops: findAtlas(state.images, "crops"),
    fences: findAtlas(state.images, "fences"),
    flooring: findAtlas(state.images, "flooring"),
    flooringWinter: findAtlas(state.images, "flooringWinter"),
    highlightGreen: findImage(state.images, "/images/highlight-green.png"),
    highlightGrey: findImage(state.images, "/images/highlight-grey.png"),
    highlightRed: findImage(state.images, "/images/highlight-red.png"),
    hoeDirt: findImage(state.images, "/images/hoeDirt.png"),
    hoeDirtSnow: findImage(state.images, "/images/hoeDirtSnow.png"),
    items: findAtlas(state.images, "items"),
  };

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  context.drawImage(images.background, 0, 0);

  const potentialEquipment = getPotentialEquipment(state, farmLayout) ?? {};

  renderFloorsToContext(
    context,
    images,
    mergeDeep(equipment, potentialEquipment),
    date,
    { height: canvasHeight / 16, width: canvasWidth / 16 },
  );

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
    images,
    mergeDeep(crops, equipment, potentialEquipment),
    date,
  );
}
