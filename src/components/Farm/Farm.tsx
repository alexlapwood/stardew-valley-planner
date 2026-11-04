import "./Farm.css";

import { mergeDeep } from "immutable";
import {
  batch,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { farmLayouts } from "../../data/sdv.json";
import { getCanvasPositionAndScale } from "../../helpers/canvas";
import { forEachTileInRegion } from "../../helpers/farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  destroyCrops,
  destroyEquipment,
} from "../../helpers/itemPlacement";
import { crops, equipment, setCrops, setEquipment } from "../../state/farm";
import { drawFarm, type IRegion } from "./Farm.canvas";
import {
  createMenuBlocker,
  type DragKind,
  dragKindByButton,
  isDragStale,
  startDrag,
} from "./Farm.drag";
import { createHighlightedRegion, type IMousePosition } from "./Farm.region";

const pickAxe: ISelectedItem = { id: "pick-axe", type: "tool" };

interface IProps {
  currentFarm:
    | "Standard"
    | "Riverland"
    | "Forest"
    | "Hill-top"
    | "Wilderness"
    | "Test";
  date: number;
  images: HTMLImageElement[];
  selectedItem?: ISelectedItem;
  disableToolbars?: (disabled: boolean) => void;
  zoom: number;
}

export default function Farm(props: IProps) {
  const [drag, setDrag] = createSignal<DragKind>();
  const [mouseDownPosition, setMouseDownPosition] =
    createSignal<IMousePosition>();
  const [mousePosition, setMousePosition] = createSignal<IMousePosition>();

  let canvasRef: HTMLCanvasElement | undefined;

  let farmRef: HTMLDivElement | undefined;

  let stopDrag: (() => void) | undefined;

  const farmWidth = 80;
  const farmHeight = 65;

  const highlightedRegion = createHighlightedRegion(
    mousePosition,
    mouseDownPosition,
    () => drag() === "pan",
  );

  const blockMenuAfterRightPress = createMenuBlocker();

  const getActiveItem = () =>
    drag() === "erase" ? pickAxe : props.selectedItem;

  const getMousePosition = (event: MouseEvent) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);

    return {
      left: left * scaleX,
      top: top * scaleY,
      x: event.clientX * scaleX,
      y: event.clientY * scaleY,
    };
  };

  const installEquipment = (equipmentToInstallList: IInstalledEquipment[]) => {
    const { installableEquipment } = checkEquipmentToInstall(
      equipmentToInstallList,
      {
        currentCrops: crops(),
        currentEquipment: equipment(),
      },
      farmLayouts[props.currentFarm.toLowerCase()],
    );

    let newEquipment: IFarmEquipment = {};

    installableEquipment.forEach((equipmentToInstall) => {
      newEquipment = mergeDeep(newEquipment, {
        [equipmentToInstall.y]: {
          [equipmentToInstall.x]: [equipmentToInstall],
        },
      });
    });

    setEquipment(mergeDeep(equipment(), newEquipment));
  };

  const eraseRegion = (highlightedRegion: IRegion) => {
    const date = props.date;
    const currentCrops: IFarmCrops = mergeDeep({}, crops());
    const currentEquipment: IFarmEquipment = mergeDeep({}, equipment());

    forEachTileInRegion(highlightedRegion, (x, y) => {
      if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
        currentCrops[y][x] = destroyCrops(currentCrops[y][x], date);
      }

      if (
        currentEquipment[y] !== undefined &&
        currentEquipment[y][x] !== undefined
      ) {
        currentEquipment[y][x] = destroyEquipment(currentEquipment[y][x], date);
      }
    });

    setCrops(currentCrops);
    setEquipment(currentEquipment);
  };

  const applyItem = (
    selectedItem: ISelectedItem,
    highlightedRegion: IRegion,
  ) => {
    const date = props.date;

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

      plantCrops(cropsToPlant);
    }

    if (selectedItem.type === "equipment") {
      const equipmentToInstall: IInstalledEquipment[] = [];
      forEachTileInRegion(highlightedRegion, (x, y) => {
        equipmentToInstall.push({
          dateInstalled: date,
          equipmentId: selectedItem.id,
          skinIndex: selectedItem.skinIndex ?? 0,
          type: "equipment",
          x,
          y,
        });
      });

      installEquipment(equipmentToInstall);
    }

    if (selectedItem.type === "tool" && selectedItem.id === "pick-axe") {
      eraseRegion(highlightedRegion);
    }
  };

  const endDrag = () => {
    batch(() => {
      stopDrag?.();
      stopDrag = undefined;
      setDrag(undefined);
      setMouseDownPosition(undefined);
      props.disableToolbars?.(false);
    });
  };

  const onMouseDown = (event: MouseEvent) => {
    batch(() => {
      blockMenuAfterRightPress(event);

      if (event.button === 1) {
        // Without this, Windows browsers start their own middle-button
        // auto-scroll.
        event.preventDefault();
      }

      const currentDrag = drag();
      if (currentDrag !== undefined) {
        endDrag();

        if (!isDragStale(currentDrag, event)) {
          return;
        }
      }

      const kind = dragKindByButton[event.button];
      if (kind === undefined) {
        return;
      }

      props.disableToolbars?.(true);
      setDrag(kind);
      stopDrag = startDrag(kind, farmRef, event, endDrag);

      if (kind === "pan") {
        return;
      }

      const position = getMousePosition(event);
      setMouseDownPosition(position);
      setMousePosition(position);
    });
  };

  const onMouseMove = (event: MouseEvent) => {
    setMousePosition(getMousePosition(event));
  };

  const onMouseOut = () => {
    batch(() => {
      setMousePosition(undefined);

      if (drag() !== "pan") {
        endDrag();
      }
    });
  };

  const onMouseUp = (event: MouseEvent) => {
    batch(() => {
      const kind = drag();
      if (kind !== undefined && dragKindByButton[event.button] !== kind) {
        return;
      }

      const activeItem = getActiveItem();
      const region = highlightedRegion();
      if (
        (kind === "put" || kind === "erase") &&
        activeItem !== undefined &&
        region !== undefined
      ) {
        applyItem(activeItem, region);
      }

      endDrag();
    });
  };

  const onScroll = () => {
    const currentMousePosition = mousePosition();
    // A pan can scroll the farm while the cursor is off it. A made-up
    // position here would show a highlight away from the cursor.
    if (currentMousePosition === undefined) {
      return;
    }

    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);

    setMousePosition({
      ...currentMousePosition,
      left: left * scaleX,
      top: top * scaleY,
    });
  };

  const plantCrops = (cropsToPlant: IPlantedCrop[]) => {
    const { plantableCrops } = checkCropsToPlant(
      cropsToPlant,
      {
        currentCrops: crops(),
        currentEquipment: equipment(),
      },
      farmLayouts[props.currentFarm.toLowerCase()],
    );

    let newCrops: IFarmCrops = {};

    plantableCrops.forEach((cropToPlant) => {
      newCrops = mergeDeep(newCrops, {
        [cropToPlant.y]: {
          [cropToPlant.x]: [cropToPlant],
        },
      });
    });

    setCrops(mergeDeep(crops(), newCrops));
  };

  const updateCanvas = () => {
    if (canvasRef) {
      drawFarm(canvasRef, {
        crops: crops(),
        currentFarm: props.currentFarm,
        date: props.date,
        equipment: equipment(),
        highlightedRegion: highlightedRegion(),
        images: props.images,
        selectedItem: getActiveItem(),
      });
    }
  };

  onMount(() => {
    if (farmRef !== undefined) {
      farmRef.scrollLeft = farmRef.scrollWidth;
      farmRef.scrollTop = 16 * 4;
    }
  });

  onCleanup(() => {
    stopDrag?.();
  });

  createEffect(() => {
    updateCanvas();
  });

  return (
    <div
      class="Farm"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onScroll={() => {
        onScroll();
      }}
      ref={farmRef}
    >
      <div
        class="Farm--canvas-wrapper"
        style={{ transform: `scale(${props.zoom})` }}
      >
        <canvas
          class="Farm--canvas"
          data-testid="farm-canvas"
          height={farmHeight * 16}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseOut={onMouseOut}
          onMouseUp={onMouseUp}
          ref={canvasRef}
          width={farmWidth * 16}
        />
      </div>
    </div>
  );
}
