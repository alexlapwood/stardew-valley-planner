import { mergeDeep } from "immutable";

import type { IBuildAnimation } from "../../helpers/buildAnimation";
import { getSeasonName } from "../../helpers/date";
import {
  getBuildingDraws,
  getDefaultBuildingDraws,
} from "../../helpers/defaultBuildings";
import {
  equipmentForRegion,
  installableEquipmentByTile,
} from "../../helpers/equipmentPlacement";
import type { TPickFloorVariant } from "../../helpers/floorVariant";
import type { ICurrentItems } from "../../helpers/itemPlacement";
import { earliestChange } from "../../helpers/mapFrames";
import {
  drawMapSlot,
  getSlotsNextChange,
  type IMapSlots,
} from "../../helpers/mapSlots";
import {
  getBuildingSiteDraws,
  getBuildScene,
  getHouseRobinDraws,
  type IBuildScene,
} from "../../helpers/renderBuildingSites";
import { getBushDraws } from "../../helpers/renderBushes";
import {
  getFrontRows,
  getPassCanvas,
  getPassesNextChange,
  renderFrontRowToContext,
} from "../../helpers/renderFarmMap";
import { getItemDraws } from "../../helpers/renderItems";
import {
  renderBuildingSelection,
  renderSelectedRegion,
} from "../../helpers/renderSelection";
import {
  type ISortedDraw,
  renderSortedDraws,
} from "../../helpers/renderSorted";
import { fadeTallSprites } from "../../helpers/tallSprites";
import { getTreeSchedule } from "../../helpers/treeGrowth";
import { getFixedLooks, getShownBuildings } from "./Farm.buildings";
import { drawGround } from "./Farm.ground";
import { findPlanImages } from "./Farm.images";
import { getBuildingPreview, type IBuildingPreview } from "./Farm.preview";
import type { IRegion } from "./Farm.region";

// The farm passes the building preview that it works out 1 time for each
// change, so that the animation frames do not check the building again.
// buildTime is the time of the build animations, which play also when the
// device asks for reduced motion. With no time, the map does not animate.
interface IFarmCanvasState {
  buildAnimations?: readonly IBuildAnimation[];
  buildingPreview?: IBuildingPreview;
  buildings: readonly IPlannedBuilding[];
  buildTime?: number;
  crops: IFarmCrops;
  cutBushes?: readonly ICutBush[];
  date: number;
  equipment: IFarmEquipment;
  greenhouseRepair?: IPlannedRepair;
  highlightedRegion?: IRegion;
  houseColorPaints?: readonly IPlannedColorPaint[];
  houseUpgrades?: readonly IPlannedHouseUpgrade[];
  images: HTMLImageElement[];
  petBowlPaints?: readonly IPlannedPaint[];
  pickFloorVariant: TPickFloorVariant;
  scene: IFarmScene;
  selectedItem?: ISelectedItem;
  time?: number;
}

function getCurrentItems(state: IFarmCanvasState): ICurrentItems {
  return {
    currentBuildings: state.buildings,
    currentCrops: state.crops,
    currentCutBushes: state.cutBushes,
    currentEquipment: state.equipment,
    currentGreenhouseRepair: state.greenhouseRepair,
    currentHouseColorPaints: state.houseColorPaints,
    currentHouseUpgrades: state.houseUpgrades,
    currentPetBowlPaints: state.petBowlPaints,
  };
}

function getHouseRobinDrawsOn(
  context: CanvasRenderingContext2D,
  robinImage: CanvasImageSource,
  { house }: IBuildScene,
  { date, scene }: IFarmCanvasState,
) {
  return house === undefined
    ? []
    : getHouseRobinDraws(
        context,
        robinImage,
        scene.map.spots.farmhouse,
        getSeasonName(date),
        house.robinFrame,
      );
}

function getPotentialEquipment(state: IFarmCanvasState) {
  const { date, highlightedRegion, selectedItem } = state;

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
    getCurrentItems(state),
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
  const { buildings, crops, date, equipment, highlightedRegion, scene, time } =
    state;
  const { map } = scene;
  const context = getContext(canvas);
  const season = getSeasonName(date);

  const images = findPlanImages(state.images);
  const bushScene = { cutBushes: state.cutBushes, date, map };

  context.clearRect(0, 0, canvas.width, canvas.height);

  const potentialEquipment = getPotentialEquipment(state) ?? {};
  const plannedItems = mergeDeep(crops, equipment, potentialEquipment);
  const buildingPreview =
    state.buildingPreview ??
    getBuildingPreview({
      currentItems: getCurrentItems(state),
      date,
      farmMap: map,
      highlightedRegion,
      selectedItem: state.selectedItem,
    });
  const buildScene = getBuildScene(
    state.buildAnimations ?? [],
    { buildings, date, houseUpgrades: state.houseUpgrades ?? [] },
    state.buildTime ?? 0,
  );
  const shownBuildings = getShownBuildings(state, buildingPreview, buildScene);
  const motion = {
    time,
    water: { image: images.water, tint: map.water.tints[scene.season] },
  };

  drawGround(context, images, {
    buildings,
    cutBushes: state.cutBushes,
    date,
    equipment: mergeDeep(equipment, potentialEquipment),
    map,
    plannedItems,
    shownBuildings,
    sites: buildScene.sites,
  });

  if (highlightedRegion !== undefined && state.selectedItem !== undefined) {
    renderSelectedRegion(
      context,
      getCurrentItems(state),
      map,
      date,
      highlightedRegion,
      images.highlight,
      state.selectedItem,
    );
  }

  const growthPlan = { ...getCurrentItems(state), farmMap: map };

  const front = getPassCanvas(scene, "front", time);
  const frontRowDraws = getFrontRows(map).map((row): ISortedDraw => ({
    draw: () => {
      renderFrontRowToContext(context, front, row);
    },
    layer: "front",
    row,
  }));

  renderSortedDraws(
    fadeTallSprites(
      context,
      [
        ...getItemDraws(context, images, plannedItems, date, (plantedTree) =>
          getTreeSchedule(growthPlan, plantedTree),
        ),
        ...getDefaultBuildingDraws(
          context,
          images.buildings,
          map,
          season,
          getFixedLooks(state, buildingPreview, buildScene),
          motion,
        ),
        ...getBuildingDraws(
          context,
          images.buildings,
          shownBuildings,
          season,
          motion,
        ),
        ...getBuildingSiteDraws(context, images, buildScene.sites, season),
        ...getHouseRobinDrawsOn(context, images.robin, buildScene, state),
        ...getBushDraws(context, images.bushes, bushScene),
        ...frontRowDraws,
      ],
      highlightedRegion,
    ),
  );

  context.drawImage(getPassCanvas(scene, "above", time), 0, 0);

  if (highlightedRegion !== undefined && state.selectedItem !== undefined) {
    renderBuildingSelection(
      context,
      getCurrentItems(state),
      map,
      date,
      highlightedRegion,
      images.highlight,
      state.selectedItem,
      buildingPreview?.check,
    );
  }
}
