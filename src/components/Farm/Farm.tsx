import "./Farm.css";

import { mergeDeep } from "immutable";
import { createEffect, createSignal, onMount } from "solid-js";

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
import { drawFarm } from "./Farm.canvas";

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
  const [isMouseDown, setIsMouseDown] = createSignal(false);
  const [mouseDownPosition, setMouseDownPosition] = createSignal<{
    // Left and top are used for updating the the cursor position
    // on the scroll event (because the scroll event doesn't actually
    // have access to the cursor position).
    left: number;
    top: number;
    x: number;
    y: number;
  }>();
  const [mousePosition, setMousePosition] = createSignal<{
    // Left and top are used for updating the the cursor position
    // on the scroll event (because the scroll event doesn't actually
    // have access to the cursor position).
    left: number;
    top: number;
    x: number;
    y: number;
  }>();

  let canvasRef: HTMLCanvasElement | undefined;

  let farmRef: HTMLDivElement | undefined;

  const farmWidth = 80;
  const farmHeight = 65;

  const getHighlightedRegion = () => {
    const currentMousePosition = mousePosition();
    const currentMouseDownPosition = mouseDownPosition();
    if (currentMousePosition === undefined) {
      return undefined;
    }

    const x1 = Math.floor(
      (currentMousePosition.x - currentMousePosition.left) / 16,
    );
    const y1 = Math.floor(
      (currentMousePosition.y - currentMousePosition.top) / 16,
    );
    let x2 = x1;
    let y2 = y1;

    if (isMouseDown() && currentMouseDownPosition) {
      x2 = Math.floor(
        (currentMouseDownPosition.x - currentMouseDownPosition.left) / 16,
      );
      y2 = Math.floor(
        (currentMouseDownPosition.y - currentMouseDownPosition.top) / 16,
      );
    }

    return { x1, x2, y1, y2 };
  };

  const calculateMousePosition = (event: MouseEvent) => {
    const { scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);
    return { x: event.clientX * scaleX, y: event.clientY * scaleY };
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

  const onMouseDown = (event: MouseEvent) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);

    const { x, y } = calculateMousePosition(event);

    if (props.disableToolbars !== undefined) {
      props.disableToolbars(true);
    }

    setIsMouseDown(true);
    setMouseDownPosition({
      left: left * scaleX,
      top: top * scaleY,
      x,
      y,
    });
  };

  const onMouseMove = (event: MouseEvent) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);

    const { x, y } = calculateMousePosition(event);

    setMousePosition({
      left: left * scaleX,
      top: top * scaleY,
      x,
      y,
    });
  };

  const onMouseOut = () => {
    if (props.disableToolbars !== undefined) {
      props.disableToolbars(false);
    }

    setIsMouseDown(false);
    setMouseDownPosition(undefined);
    setMousePosition(undefined);
  };

  const onMouseUp = () => {
    if (props.disableToolbars !== undefined) {
      props.disableToolbars(false);
    }

    const selectedItem = props.selectedItem;
    const date = props.date;

    if (!isMouseDown() || selectedItem === undefined) {
      return;
    }
    const highlightedRegion = getHighlightedRegion();
    if (highlightedRegion === undefined) {
      return;
    }

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

    if (selectedItem.type === "tool") {
      if (selectedItem.id === "pick-axe") {
        const currentCrops: IFarmCrops = mergeDeep({}, crops());
        const currentEquipment: IFarmEquipment = mergeDeep({}, equipment());

        forEachTileInRegion(highlightedRegion, (x, y) => {
          if (
            currentCrops[y] !== undefined &&
            currentCrops[y][x] !== undefined
          ) {
            currentCrops[y][x] = destroyCrops(currentCrops[y][x], date);
          }

          if (
            currentEquipment[y] !== undefined &&
            currentEquipment[y][x] !== undefined
          ) {
            currentEquipment[y][x] = destroyEquipment(
              currentEquipment[y][x],
              date,
            );
          }
        });

        setCrops(currentCrops);
        setEquipment(currentEquipment);
      }
    }

    setIsMouseDown(false);
    setMouseDownPosition(undefined);
  };

  const onScroll = () => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(canvasRef);

    setMousePosition({
      x: 0,
      y: 0,
      ...mousePosition(),
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
        highlightedRegion: getHighlightedRegion(),
        images: props.images,
        selectedItem: props.selectedItem,
      });
    }
  };

  onMount(() => {
    updateCanvas();

    if (farmRef !== undefined) {
      farmRef.scrollLeft = farmRef.scrollWidth;
      farmRef.scrollTop = 16 * 4;
    }
  });

  createEffect(() => {
    updateCanvas();
  });

  return (
    <div
      class="Farm"
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
