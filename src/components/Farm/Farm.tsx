import "./Farm.css";

import { createEffect, createMemo, createResource, on } from "solid-js";

import { getSeasonName } from "../../helpers/date";
import { defaultFarmLooks } from "../../helpers/defaultBuildings";
import {
  loadFarmScene,
  peekFarmScene,
  type TFarmId,
} from "../../helpers/farmMapLoader";
import { createFloorVariantPicker } from "../../helpers/floorVariant";
import { createFrameTime, createMapClock } from "../../helpers/mapClock";
import { earliestChange, noChange } from "../../helpers/mapFrames";
import { getMapSlots, type IMapSlots } from "../../helpers/mapSlots";
import { crops, equipment } from "../../state/farm";
import {
  drawMap,
  drawPlan,
  getMapNextChange,
  getPlanNextChange,
} from "./Farm.canvas";
import { applyItem } from "./Farm.edit";
import { createFarmPointer } from "./Farm.pointer";

interface IProps {
  currentFarm: TFarmId;
  date: number;
  images: HTMLImageElement[];
  looks?: IFarmLooks;
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

export default function Farm(props: IProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  let mapCanvasRef: HTMLCanvasElement | undefined;

  let farmRef: HTMLDivElement | undefined;

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

  const looks = () => props.looks ?? defaultFarmLooks;

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

  const planNextChange = createMemo(() => {
    const map = farmMap();

    return map === undefined ? noChange : getPlanNextChange(map);
  });

  const time = createMapClock(() =>
    earliestChange([mapNextChange(), planNextChange()]),
  );
  const mapTime = createFrameTime(time, mapNextChange);
  const planTime = createFrameTime(time, planNextChange);

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

      applyItem(item, region, {
        date: props.date,
        farmMap: map,
        pickFloorVariant: floorVariants.pick,
      });
      floorVariants.reset();
    },
    scrollView: () => farmRef,
    selectedItem: () => props.selectedItem,
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
        crops: crops(),
        date: props.date,
        equipment: equipment(),
        highlightedRegion: highlightedRegion(),
        images: props.images,
        looks: looks(),
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
    </div>
  );
}
