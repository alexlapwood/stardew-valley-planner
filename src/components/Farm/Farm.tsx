import "./Farm.css";

import { mergeDeep } from "immutable";
import { createEffect, createSignal, onMount } from "solid-js";

import { farmLayouts } from "../../data/sdv.json";
import { getCanvasPositionAndScale } from "../../helpers/canvas";
import { getSeason } from "../../helpers/date";
import { forEachTileInRegion } from "../../helpers/farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  destroyCrops,
  destroyEquipment,
} from "../../helpers/itemPlacement";
import {
  renderFlooringToContext,
  renderItemsToContext,
  renderScarecrowProtectionToContext,
  renderSelectedRegion,
  renderSoilToContext,
  renderWateredSoilToContext,
} from "../../helpers/renderToCanvas";
import { crops, equipment, setCrops, setEquipment } from "../../state/farm";

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
      return;
    }

    const x1 = Math.floor(
      (currentMousePosition.x - currentMousePosition.left) / 16
    );
    const y1 = Math.floor(
      (currentMousePosition.y - currentMousePosition.top) / 16
    );
    let x2 = x1;
    let y2 = y1;

    if (isMouseDown() && currentMouseDownPosition) {
      x2 = Math.floor(
        (currentMouseDownPosition.x - currentMouseDownPosition.left) / 16
      );
      y2 = Math.floor(
        (currentMouseDownPosition.y - currentMouseDownPosition.top) / 16
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
      farmLayouts[props.currentFarm.toLowerCase()]
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

    if (isMouseDown() === false || props.selectedItem === undefined) {
      return;
    }
    const highlightedRegion = getHighlightedRegion();
    if (highlightedRegion === undefined) {
      return;
    }

    if (props.selectedItem.type === "crop") {
      const cropsToPlant: IPlantedCrop[] = [];
      forEachTileInRegion(highlightedRegion, (x, y) => {
        if (props.selectedItem?.id) {
          cropsToPlant.push({
            cropId: props.selectedItem.id,
            datePlanted: props.date,
            type: "crop",
            x,
            y,
          });
        }
      });

      plantCrops(cropsToPlant);
    }

    if (props.selectedItem.type === "equipment") {
      const equipmentToInstall: IInstalledEquipment[] = [];
      forEachTileInRegion(highlightedRegion, (x, y) => {
        if (props.selectedItem?.id) {
          equipmentToInstall.push({
            dateInstalled: props.date,
            equipmentId: props.selectedItem.id,
            skinIndex: props.selectedItem.skinIndex || 0,
            type: "equipment",
            x,
            y,
          });
        }
      });

      installEquipment(equipmentToInstall);
    }

    if (props.selectedItem.type === "tool") {
      if (props.selectedItem.id === "pick-axe") {
        const currentCrops: IFarmCrops = mergeDeep({}, crops());
        const currentEquipment: IFarmEquipment = mergeDeep({}, equipment());

        forEachTileInRegion(highlightedRegion, (x, y) => {
          if (
            currentCrops[y] !== undefined &&
            currentCrops[y][x] !== undefined
          ) {
            currentCrops[y][x] = destroyCrops(currentCrops[y][x], props.date);
          }

          if (
            currentEquipment[y] !== undefined &&
            currentEquipment[y][x] !== undefined
          ) {
            currentEquipment[y][x] = destroyEquipment(
              currentEquipment[y][x],
              props.date
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
      farmLayouts[props.currentFarm.toLowerCase()]
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

  function getPotentialEquipment() {
    const highlightedRegion = getHighlightedRegion();

    if (
      highlightedRegion === undefined ||
      props.selectedItem === undefined ||
      props.selectedItem.type !== "equipment"
    ) {
      return;
    }

    const equipmentToInstallList: IInstalledEquipment[] = [];
    forEachTileInRegion(highlightedRegion, (x, y) => {
      if (
        highlightedRegion === undefined ||
        props.selectedItem === undefined ||
        props.selectedItem.type !== "equipment"
      ) {
        return;
      }

      equipmentToInstallList.push({
        dateInstalled: props.date,
        equipmentId: props.selectedItem.id,
        skinIndex: props.selectedItem.skinIndex || 0,
        type: "equipment",
        x,
        y,
      });
    });

    const { installableEquipment } = checkEquipmentToInstall(
      equipmentToInstallList,
      {
        currentCrops: crops(),
        currentEquipment: equipment(),
      },
      farmLayouts[props.currentFarm.toLowerCase()]
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

  const updateCanvas = () => {
    if (canvasRef) {
      const canvasHeight = canvasRef.height;
      const canvasWidth = canvasRef.width;
      const context = canvasRef.getContext("2d");

      if (canvasRef === undefined || context === null) {
        throw new Error("Could not get context for canvas");
      }

      context.imageSmoothingEnabled = false;

      const season = ["spring", "summer", "fall", "winter"][
        getSeason(props.date)
      ];

      const backgroundImage = props.images.find((image) =>
        image.src.includes(
          `/images/${
            props.currentFarm === "Test"
              ? "standard"
              : props.currentFarm.toLowerCase()
          }-${season}.png`
        )
      );
      const highlightGreenImage = props.images.find((image) =>
        image.src.includes("/images/highlight-green.png")
      );
      const highlightGreyImage = props.images.find((image) =>
        image.src.includes("/images/highlight-grey.png")
      );
      const highlightRedImage = props.images.find((image) =>
        image.src.includes("/images/highlight-red.png")
      );
      const cropsImage = props.images.find((image) =>
        image.src.includes("/images/crops.png")
      );
      const equipmentImage = props.images.find((image) =>
        image.src.includes("/images/equipment-sheet.png")
      );
      const hoeDirtImage = props.images.find((image) =>
        image.src.includes("/images/hoeDirt.png")
      );
      const hoeDirtSnowImage = props.images.find((image) =>
        image.src.includes("/images/hoeDirtSnow.png")
      );
      const fenceImage = props.images.find((image) =>
        image.src.includes("/images/fences.png")
      );
      const flooringImage = props.images.find((image) =>
        image.src.includes("/images/flooring.png")
      );

      if (
        backgroundImage === undefined ||
        highlightGreenImage === undefined ||
        highlightGreyImage === undefined ||
        highlightRedImage === undefined ||
        cropsImage === undefined ||
        equipmentImage === undefined ||
        hoeDirtImage === undefined ||
        hoeDirtSnowImage === undefined ||
        fenceImage === undefined ||
        flooringImage === undefined
      ) {
        throw new Error("Error loading images");
      }

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      context.drawImage(backgroundImage, 0, 0);

      const potentialEquipment = getPotentialEquipment() || {};

      renderSoilToContext(
        context,
        season === "winter" ? hoeDirtSnowImage : hoeDirtImage,
        mergeDeep(crops(), equipment(), potentialEquipment),
        farmLayouts[props.currentFarm.toLowerCase()],
        props.date
      );

      renderWateredSoilToContext(
        context,
        season === "winter" ? hoeDirtSnowImage : hoeDirtImage,
        mergeDeep(equipment(), potentialEquipment),
        farmLayouts[props.currentFarm.toLowerCase()],
        props.date
      );

      renderFlooringToContext(
        context,
        flooringImage,
        mergeDeep(equipment(), potentialEquipment),
        props.date
      );

      renderScarecrowProtectionToContext(
        context,
        highlightGreenImage,
        mergeDeep(equipment(), potentialEquipment),
        farmLayouts[props.currentFarm.toLowerCase()],
        props.date
      );

      if (mousePosition() && props.selectedItem !== undefined) {
        const highlightedRegion = getHighlightedRegion();
        if (highlightedRegion === undefined) {
          return;
        }

        renderSelectedRegion(
          context,
          crops(),
          equipment(),
          farmLayouts[props.currentFarm.toLowerCase()],
          props.date,
          highlightedRegion,
          highlightGreenImage,
          highlightGreyImage,
          highlightRedImage,
          equipmentImage,
          fenceImage,
          props.selectedItem
        );
      }

      renderItemsToContext(
        context,
        cropsImage,
        equipmentImage,
        fenceImage,
        mergeDeep(crops(), equipment(), potentialEquipment),
        props.date
      );
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
    <div class="Farm" onScroll={() => onScroll()} ref={farmRef}>
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
