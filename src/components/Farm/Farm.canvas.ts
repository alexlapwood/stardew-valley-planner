import { mergeDeep } from "immutable";

import { findAtlas, findImage } from "../../helpers/atlas";
import { getSeasonName } from "../../helpers/date";
import {
  drawDefaultBuildingShadows,
  getDefaultBuildingDraws,
} from "../../helpers/defaultBuildings";
import {
  equipmentForRegion,
  installableEquipmentByTile,
} from "../../helpers/equipmentPlacement";
import type { TPickFloorVariant } from "../../helpers/floorVariant";
import { earliestChange } from "../../helpers/mapFrames";
import {
  drawMapSlot,
  getSlotsNextChange,
  type IMapSlots,
} from "../../helpers/mapSlots";
import {
  getFrontRows,
  getPassCanvas,
  getPassesNextChange,
  renderFrontRowToContext,
} from "../../helpers/renderFarmMap";
import { renderFloorsToContext } from "../../helpers/renderFloors";
import { getItemDraws } from "../../helpers/renderItems";
import { renderSelectedRegion } from "../../helpers/renderSelection";
import {
  type ISortedDraw,
  renderSortedDraws,
} from "../../helpers/renderSorted";
import {
  renderScarecrowProtectionToContext,
  renderSoilToContext,
  renderWateredSoilToContext,
} from "../../helpers/renderTileMaps";
import type { IRegion } from "./Farm.region";

interface IFarmCanvasState {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
  highlightedRegion?: IRegion;
  images: HTMLImageElement[];
  looks: IFarmLooks;
  pickFloorVariant: TPickFloorVariant;
  scene: IFarmScene;
  selectedItem?: ISelectedItem;
  time?: number;
}

function getPotentialEquipment(state: IFarmCanvasState) {
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
    state.scene.map,
  );
}

function getContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not get context for canvas");
  }

  context.imageSmoothingEnabled = false;

  return context;
}

export function getMapNextChange(map: IFarmMap, slots: IMapSlots) {
  return earliestChange([
    getPassesNextChange(map, ["back", "buildings"]),
    getSlotsNextChange(slots),
  ]);
}

export function getPlanNextChange(map: IFarmMap) {
  return getPassesNextChange(map, ["front", "above"]);
}

export function drawMap(
  canvas: HTMLCanvasElement,
  scene: IFarmScene,
  time: number,
  slots: IMapSlots,
) {
  const context = getContext(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(getPassCanvas(scene, "back", time), 0, 0);
  drawMapSlot(context, slots.water, time);
  drawMapSlot(context, slots.underBuildings, time);
  context.drawImage(getPassCanvas(scene, "buildings", time), 0, 0);
}

export function drawPlan(canvas: HTMLCanvasElement, state: IFarmCanvasState) {
  const { crops, date, equipment, highlightedRegion, scene, time } = state;
  const { map } = scene;
  const context = getContext(canvas);
  const season = getSeasonName(date);

  const images = {
    buildings: findAtlas(state.images, "buildings"),
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

  context.clearRect(0, 0, canvas.width, canvas.height);

  const potentialEquipment = getPotentialEquipment(state) ?? {};

  renderFloorsToContext(
    context,
    images,
    mergeDeep(equipment, potentialEquipment),
    date,
    { height: map.height, width: map.width },
  );

  renderSoilToContext(
    context,
    season === "winter" ? images.hoeDirtSnow : images.hoeDirt,
    mergeDeep(crops, equipment, potentialEquipment),
    map,
    date,
  );

  renderWateredSoilToContext(
    context,
    season === "winter" ? images.hoeDirtSnow : images.hoeDirt,
    mergeDeep(equipment, potentialEquipment),
    map,
    date,
  );

  drawDefaultBuildingShadows(context, images.buildings, map, "overFloors");

  renderScarecrowProtectionToContext(
    context,
    images.highlightGreen,
    mergeDeep(equipment, potentialEquipment),
    map,
    date,
  );

  if (highlightedRegion !== undefined && state.selectedItem !== undefined) {
    renderSelectedRegion(
      context,
      crops,
      equipment,
      map,
      date,
      highlightedRegion,
      images.highlightGreen,
      images.highlightGrey,
      images.highlightRed,
      state.selectedItem,
    );
  }

  const front = getPassCanvas(scene, "front", time);
  const frontRowDraws = getFrontRows(map).map((row): ISortedDraw => ({
    draw: () => {
      renderFrontRowToContext(context, front, row);
    },
    layer: "front",
    row,
  }));

  renderSortedDraws([
    ...getItemDraws(
      context,
      images,
      mergeDeep(crops, equipment, potentialEquipment),
      date,
    ),
    ...getDefaultBuildingDraws(
      context,
      images.buildings,
      map,
      season,
      state.looks,
    ),
    ...frontRowDraws,
  ]);

  context.drawImage(getPassCanvas(scene, "above", time), 0, 0);
}
