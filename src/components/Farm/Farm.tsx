import "./Farm.css";

import {
  createEffect,
  createMemo,
  createResource,
  createUniqueId,
  on,
  Show,
} from "solid-js";

import { getSeasonName } from "../../helpers/date";
import {
  loadFarmScene,
  peekFarmScene,
  type TFarmId,
} from "../../helpers/farmMapLoader";
import { createFloorVariantPicker } from "../../helpers/floorVariant";
import { createFrameTime, createMapClock } from "../../helpers/mapClock";
import { earliestChange, noChange } from "../../helpers/mapFrames";
import { getMapSlots, type IMapSlots } from "../../helpers/mapSlots";
import {
  buildings,
  crops,
  cutBushes,
  equipment,
  greenhouseRepair,
  houseColorPaints,
  houseUpgrades,
  petBowlPaints,
} from "../../state/farm";
import { placeTooltip, TooltipBox } from "../Tooltip/Tooltip";
import { createBuildAnimations } from "./Farm.build";
import { getPlanNextChange } from "./Farm.buildings";
import { drawMap, drawPlan, getMapNextChange } from "./Farm.canvas";
import { applyItem } from "./Farm.edit";
import { createFarmPointer } from "./Farm.pointer";
import {
  getBuildingPreview,
  getPlanNotice,
  type IPreviewState,
} from "./Farm.preview";

interface IProps {
  currentFarm: TFarmId;
  date: number;
  images: HTMLImageElement[];
  selectedItem?: ISelectedItem;
  disableToolbars?: (disabled: boolean) => void;
  zoom: number;
}

interface ISceneKey {
  farmId: string;
  season: string;
}

async function loadScene({ farmId, season }: ISceneKey) {
  try {
    return await loadFarmScene(farmId, season);
  } catch (error) {
    console.error(
      `Could not load the ${farmId} farm map for ${season}.`,
      error,
    );
    throw error;
  }
}

function scrollToFarmhouse(view: HTMLElement, map: IFarmMap) {
  const { farmhouse } = map.spots;

  view.scrollLeft =
    (farmhouse.x + farmhouse.width / 2) * 16 - view.clientWidth / 2;
  view.scrollTop = 16 * 4;
}

// The notice is above the tile under the cursor, so that it does not hide the
// footprint, and it stays in the part of the farm that the view shows.
function placeNotice(
  notice: HTMLElement,
  view: HTMLElement,
  { x, y }: IFarmTile,
  zoom: number,
) {
  const tile = 16 * zoom;

  placeTooltip(
    notice,
    { height: tile, width: tile, x: x * tile, y: y * tile },
    {
      height: view.clientHeight,
      width: view.clientWidth,
      x: view.scrollLeft,
      y: view.scrollTop,
    },
  );
}

export default function Farm(props: IProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  let mapCanvasRef: HTMLCanvasElement | undefined;

  let farmRef: HTMLDivElement | undefined;

  let noticeRef: HTMLDivElement | undefined;

  const noticeId = createUniqueId();

  const season = createMemo(() => getSeasonName(props.date));

  // A scene that is already loaded comes back at once, so that a farm or season
  // seen before draws with no empty frame.
  const [scene] = createResource(
    (): ISceneKey => ({
      farmId: props.currentFarm,
      season: season(),
    }),
    (key) => peekFarmScene(key.farmId, key.season) ?? loadScene(key),
  );

  const loadedScene = () => (scene.error === undefined ? scene() : undefined);

  const farmMap = createMemo(() => loadedScene()?.map);

  const mapSlots = createMemo((): IMapSlots => {
    const currentScene = loadedScene();

    return currentScene === undefined
      ? {}
      : getMapSlots(currentScene, props.images);
  });

  const mapNextChange = createMemo(() => {
    const map = farmMap();

    return map === undefined ? noChange : getMapNextChange(map, mapSlots());
  });

  const builds = createBuildAnimations(() => ({
    buildings: buildings(),
    date: props.date,
    houseUpgrades: houseUpgrades(),
  }));

  // The preview and the placement share these picks until the drag puts the
  // floor down, so the preview does not flicker and the placed floor looks
  // like the preview.
  const floorVariants = createFloorVariantPicker();

  const {
    getActiveItem,
    highlightedRegion,
    onContextMenu,
    onMouseDown,
    onMouseMove,
    onMouseOut,
    onMouseUp,
    onScroll,
  } = createFarmPointer({
    canvas: () => canvasRef,
    disableToolbars: (disabled) => props.disableToolbars?.(disabled),
    onApply: (item, region) => {
      const map = farmMap();

      if (map === undefined) {
        return;
      }

      const build = applyItem(item, region, {
        date: props.date,
        farmMap: map,
        pickFloorVariant: floorVariants.pick,
      });
      floorVariants.reset();

      if (build !== undefined) {
        builds.start(build, props.date, clock.now());
      }
    },
    scrollView: () => farmRef,
    selectedItem: () => props.selectedItem,
  });

  const previewState = (): IPreviewState | undefined => {
    const map = farmMap();

    return map === undefined
      ? undefined
      : {
          currentItems: {
            currentBuildings: buildings(),
            currentCrops: crops(),
            currentCutBushes: cutBushes(),
            currentEquipment: equipment(),
            currentGreenhouseRepair: greenhouseRepair(),
            currentHouseColorPaints: houseColorPaints(),
            currentHouseUpgrades: houseUpgrades(),
            currentPetBowlPaints: petBowlPaints(),
          },
          date: props.date,
          farmMap: map,
          highlightedRegion: highlightedRegion(),
          selectedItem: getActiveItem(),
        };
  };

  const buildingPreview = createMemo(() => {
    const state = previewState();

    return state === undefined ? undefined : getBuildingPreview(state);
  });

  const planNextChange = createMemo(() => {
    const map = farmMap();

    return map === undefined
      ? noChange
      : getPlanNextChange(map, {
          buildingPreview: buildingPreview(),
          buildings: buildings(),
          date: props.date,
          greenhouseRepair: greenhouseRepair(),
          houseColorPaints: houseColorPaints(),
          houseUpgrades: houseUpgrades(),
          petBowlPaints: petBowlPaints(),
        });
  });

  const clock = createMapClock(
    () => earliestChange([mapNextChange(), planNextChange()]),
    builds.nextChange,
  );
  const mapTime = createFrameTime(clock.motionTime, mapNextChange);
  const planTime = createFrameTime(clock.motionTime, planNextChange);
  const buildTime = createFrameTime(clock.time, builds.nextChange);

  const planNotice = createMemo(() => {
    const state = previewState();

    return state === undefined
      ? undefined
      : getPlanNotice(state, buildingPreview());
  });

  const updateMapCanvas = () => {
    const currentScene = loadedScene();

    if (mapCanvasRef && currentScene) {
      drawMap(mapCanvasRef, currentScene, mapTime(), mapSlots());
    }
  };

  const updateCanvas = () => {
    const currentScene = loadedScene();

    if (canvasRef && currentScene) {
      drawPlan(canvasRef, {
        buildAnimations: builds.animations(),
        buildingPreview: buildingPreview(),
        buildings: buildings(),
        buildTime: buildTime(),
        crops: crops(),
        cutBushes: cutBushes(),
        date: props.date,
        equipment: equipment(),
        greenhouseRepair: greenhouseRepair(),
        highlightedRegion: highlightedRegion(),
        houseColorPaints: houseColorPaints(),
        houseUpgrades: houseUpgrades(),
        images: props.images,
        petBowlPaints: petBowlPaints(),
        pickFloorVariant: floorVariants.pick,
        scene: currentScene,
        selectedItem: getActiveItem(),
        time: planTime(),
      });
    }
  };

  createEffect(
    on(farmMap, (map) => {
      if (map !== undefined && farmRef !== undefined) {
        scrollToFarmhouse(farmRef, map);
      }
    }),
  );

  createEffect(() => {
    updateMapCanvas();
  });

  createEffect(() => {
    updateCanvas();
  });

  createEffect(() => {
    const notice = planNotice();

    if (
      notice !== undefined &&
      noticeRef !== undefined &&
      farmRef !== undefined
    ) {
      placeNotice(noticeRef, farmRef, notice.tile, props.zoom);
    }
  });

  return (
    <div
      class="Farm"
      onContextMenu={onContextMenu}
      onScroll={onScroll}
      ref={farmRef}
    >
      <div
        class="Farm--canvas-wrapper"
        style={{ transform: `scale(${props.zoom})` }}
      >
        <canvas
          class="Farm--map-canvas"
          height={(farmMap()?.height ?? 0) * 16}
          ref={mapCanvasRef}
          width={(farmMap()?.width ?? 0) * 16}
        />
        <canvas
          aria-describedby={planNotice() === undefined ? undefined : noticeId}
          class="Farm--canvas"
          data-testid="farm-canvas"
          height={(farmMap()?.height ?? 0) * 16}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseOut={onMouseOut}
          onMouseUp={onMouseUp}
          ref={canvasRef}
          width={(farmMap()?.width ?? 0) * 16}
        />
      </div>
      <Show when={planNotice()}>
        {(notice) => (
          <TooltipBox
            id={noticeId}
            lines={notice().lines}
            ref={noticeRef}
            testId="farm-notice"
          />
        )}
      </Show>
    </div>
  );
}
