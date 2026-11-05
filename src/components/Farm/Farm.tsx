import "./Farm.css";

import { createEffect, onMount } from "solid-js";

import { createFloorVariantPicker } from "../../helpers/floorVariant";
import { crops, equipment } from "../../state/farm";
import { drawFarm } from "./Farm.canvas";
import { applyItem } from "./Farm.edit";
import { createFarmPointer } from "./Farm.pointer";

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
  let canvasRef: HTMLCanvasElement | undefined;

  let farmRef: HTMLDivElement | undefined;

  const farmWidth = 80;
  const farmHeight = 65;

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
      applyItem(item, region, {
        currentFarm: props.currentFarm,
        date: props.date,
        pickFloorVariant: floorVariants.pick,
      });
      floorVariants.reset();
    },
    scrollView: () => farmRef,
    selectedItem: () => props.selectedItem,
  });

  const updateCanvas = () => {
    if (canvasRef) {
      drawFarm(canvasRef, {
        crops: crops(),
        currentFarm: props.currentFarm,
        date: props.date,
        equipment: equipment(),
        highlightedRegion: highlightedRegion(),
        images: props.images,
        pickFloorVariant: floorVariants.pick,
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
