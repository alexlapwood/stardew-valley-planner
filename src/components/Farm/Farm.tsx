import * as React from "react";

import { mergeDeep } from "immutable";
import { getCanvasPositionAndScale } from "../../helpers/canvas";
import { getSeason } from "../../helpers/date";
import { forEachTileInRegion } from "../../helpers/farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  destroyCrops,
  destroyEquipment
} from "../../helpers/itemPlacement";
import {
  renderFlooringToContext,
  renderItemsToContext,
  renderSelectedRegion,
  renderSoilToContext,
  renderWateredSoilToContext
} from "../../helpers/renderToCanvas";

import "./Farm.css";

interface IProps {
  currentFarm: string[];
  date: number;
  images: HTMLImageElement[];
  selectedItem?: ISelectedItem;
  disableToolbars?: (disabled: boolean) => void;
  zoom: number;
}

interface IState {
  buildings: IFarmBuildings;
  crops: IFarmCrops;
  equipment: IFarmEquipment;
  isMouseDown: boolean;
  mouseDownPosition?: {
    // Left and top are used for updating the the cursor position
    // on the scroll event (because the scroll event doesn't actually
    // have access to the cursor position).
    left: number;
    top: number;
    x: number;
    y: number;
  };
  mousePosition?: {
    // Left and top are used for updating the the cursor position
    // on the scroll event (because the scroll event doesn't actually
    // have access to the cursor position).
    left: number;
    top: number;
    x: number;
    y: number;
  };
}

class Farm extends React.Component<IProps> {
  public state: IState = {
    buildings: {},
    crops: {},
    equipment: {},
    isMouseDown: false
  };

  public canvas?: HTMLCanvasElement;
  private farm: HTMLDivElement;
  private farmWidth = 80;
  private farmHeight = 65;

  public componentDidMount() {
    this.updateCanvas();
    if (this.farm !== undefined) {
      this.farm.scrollLeft = this.farm.scrollWidth;
      this.farm.scrollTop = 16 * 4;
    }
  }

  public render() {
    const { zoom } = this.props;

    this.updateCanvas();

    return (
      <div
        className="Farm"
        onScroll={this.onScroll}
        ref={farm => {
          this.farm = farm as HTMLDivElement;
        }}
      >
        <div
          className="Farm--canvas-wrapper"
          style={{ transform: `scale(${zoom})` }}
        >
          <canvas
            className="Farm--canvas"
            height={this.farmHeight * 16}
            onMouseDown={this.onMouseDown}
            onMouseMove={this.onMouseMove}
            onMouseUp={this.onMouseUp}
            onMouseOut={this.onMouseOut}
            ref={ref => {
              if (ref !== null) {
                this.canvas = ref;
              }
            }}
            width={this.farmWidth * 16}
          />
        </div>
      </div>
    );
  }

  private getHighlightedRegion = () => {
    const { isMouseDown, mouseDownPosition, mousePosition } = this.state;
    if (mousePosition === undefined) {
      return;
    }

    const x1 = Math.floor((mousePosition.x - mousePosition.left) / 16);
    const y1 = Math.floor((mousePosition.y - mousePosition.top) / 16);
    let x2 = x1;
    let y2 = y1;

    if (isMouseDown && mouseDownPosition) {
      x2 = Math.floor((mouseDownPosition.x - mouseDownPosition.left) / 16);
      y2 = Math.floor((mouseDownPosition.y - mouseDownPosition.top) / 16);
    }

    return { x1, x2, y1, y2 };
  };

  private calculateMousePosition = (event: React.MouseEvent<HTMLElement>) => {
    const { scaleX, scaleY } = getCanvasPositionAndScale(this.canvas);
    return { x: event.clientX * scaleX, y: event.clientY * scaleY };
  };

  private installEquipment = (
    equipmentToInstallList: IInstalledEquipment[]
  ) => {
    const { installableEquipment } = checkEquipmentToInstall(
      equipmentToInstallList,
      {
        currentCrops: this.state.crops,
        currentEquipment: this.state.equipment
      },
      this.props.currentFarm
    );

    let newEquipment: IFarmEquipment = {};

    installableEquipment.forEach(equipmentToInstall => {
      newEquipment = mergeDeep(newEquipment, {
        [equipmentToInstall.y]: {
          [equipmentToInstall.x]: [equipmentToInstall]
        }
      });
    });

    this.setState({
      equipment: mergeDeep(this.state.equipment, newEquipment)
    });
  };

  private onMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      this.canvas
    );

    const { x, y } = this.calculateMousePosition(event);

    if (this.props.disableToolbars !== undefined) {
      this.props.disableToolbars(true);
    }

    this.setState({
      isMouseDown: true,
      mouseDownPosition: {
        left: left * scaleX,
        top: top * scaleY,
        x,
        y
      }
    });
  };

  private onMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      this.canvas
    );

    const { x, y } = this.calculateMousePosition(event);

    this.setState({
      mousePosition: { left: left * scaleX, top: top * scaleY, x, y }
    });
  };

  private onMouseOut = () => {
    if (this.props.disableToolbars !== undefined) {
      this.props.disableToolbars(false);
    }

    this.setState({
      isMouseDown: false,
      mouseDownPosition: undefined,
      mousePosition: undefined
    });
  };

  private onMouseUp = () => {
    if (this.props.disableToolbars !== undefined) {
      this.props.disableToolbars(false);
    }

    const { date, selectedItem } = this.props;
    if (this.state.isMouseDown === false || selectedItem === undefined) {
      return;
    }
    const highlightedRegion = this.getHighlightedRegion();
    if (highlightedRegion === undefined) {
      return;
    }

    if (selectedItem.type === "crop") {
      const cropsToPlant: IPlantedCrop[] = [];
      forEachTileInRegion(highlightedRegion, (x, y) => {
        cropsToPlant.push({
          cropId: selectedItem.id,
          datePlanted: this.props.date,
          type: "crop",
          x,
          y
        });
      });

      this.plantCrops(cropsToPlant);
    }

    if (selectedItem.type === "equipment") {
      const equipmentToInstall: IInstalledEquipment[] = [];
      forEachTileInRegion(highlightedRegion, (x, y) => {
        equipmentToInstall.push({
          dateInstalled: this.props.date,
          equipmentId: selectedItem.id,
          skinIndex: selectedItem.skinIndex || 0,
          type: "equipment",
          x,
          y
        });
      });

      this.installEquipment(equipmentToInstall);
    }

    if (selectedItem.type === "tool") {
      if (selectedItem.id === "pick-axe") {
        const currentCrops: IFarmCrops = mergeDeep({}, this.state.crops);
        const currentEquipment: IFarmEquipment = mergeDeep(
          {},
          this.state.equipment
        );

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
              date
            );
          }
        });

        this.setState({
          crops: currentCrops,
          equipment: currentEquipment
        });
      }
    }

    this.setState({
      isMouseDown: false,
      mouseDownPosition: undefined
    });
  };

  private onScroll = (event: React.UIEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      this.canvas
    );

    this.setState({
      mousePosition: {
        ...this.state.mousePosition,
        left: left * scaleX,
        top: top * scaleY
      }
    });
  };

  private plantCrops = (cropsToPlant: IPlantedCrop[]) => {
    const { plantableCrops } = checkCropsToPlant(
      cropsToPlant,
      {
        currentCrops: this.state.crops,
        currentEquipment: this.state.equipment
      },
      this.props.currentFarm
    );

    let newCrops: IFarmCrops = {};

    plantableCrops.forEach(cropToPlant => {
      newCrops = mergeDeep(newCrops, {
        [cropToPlant.y]: {
          [cropToPlant.x]: [cropToPlant]
        }
      });
    });

    this.setState({
      crops: mergeDeep(this.state.crops, newCrops)
    });
  };

  private getPotentialEquipment() {
    const highlightedRegion = this.getHighlightedRegion();
    const { currentFarm, date, selectedItem } = this.props;

    if (
      highlightedRegion === undefined ||
      selectedItem === undefined ||
      selectedItem.type !== "equipment"
    ) {
      return;
    }

    const equipmentToInstallList: IInstalledEquipment[] = [];
    forEachTileInRegion(highlightedRegion, (x, y) => {
      equipmentToInstallList.push({
        dateInstalled: date,
        equipmentId: selectedItem.id,
        skinIndex: selectedItem.skinIndex || 0,
        type: "equipment",
        x,
        y
      });
    });

    const { installableEquipment } = checkEquipmentToInstall(
      equipmentToInstallList,
      {
        currentCrops: this.state.crops,
        currentEquipment: this.state.equipment
      },
      currentFarm
    );

    let newEquipment: IFarmEquipment = {};

    installableEquipment.forEach(equipmentToInstall => {
      newEquipment = mergeDeep(newEquipment, {
        [equipmentToInstall.y]: {
          [equipmentToInstall.x]: [equipmentToInstall]
        }
      });
    });

    return newEquipment;
  }

  private updateCanvas = () => {
    const { currentFarm, date, images } = this.props;

    if (this.canvas) {
      const canvasHeight = this.canvas.height;
      const canvasWidth = this.canvas.width;
      const context = this.canvas.getContext("2d");

      if (this.canvas === null || context === null) {
        throw new Error("Could not get context for canvas");
      }

      context.mozImageSmoothingEnabled = false;
      context.webkitImageSmoothingEnabled = false;
      context.oImageSmoothingEnabled = false;
      context.imageSmoothingEnabled = false;

      const season = ["spring", "summer", "fall", "winter"][getSeason(date)];

      const backgroundImage = images.find(image =>
        image.src.includes(`/background-${season}.png`)
      );
      const highlightGreenImage = images.find(image =>
        image.src.includes("/images/highlight-green.png")
      );
      const highlightGreyImage = images.find(image =>
        image.src.includes("/images/highlight-grey.png")
      );
      const highlightRedImage = images.find(image =>
        image.src.includes("/images/highlight-red.png")
      );
      const cropsImage = images.find(image =>
        image.src.includes("/images/crops.png")
      );
      const equipmentImage = images.find(image =>
        image.src.includes("/images/equipment-sheet.png")
      );
      const hoeDirtImage = images.find(image =>
        image.src.includes("/images/hoeDirt.png")
      );
      const hoeDirtSnowImage = images.find(image =>
        image.src.includes("/images/hoeDirtSnow.png")
      );
      const fenceImage = images.find(image =>
        image.src.includes("/images/fences.png")
      );
      const flooringImage = images.find(image =>
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

      const potentialEquipment = this.getPotentialEquipment() || {};

      renderSoilToContext(
        context,
        season === "winter" ? hoeDirtSnowImage : hoeDirtImage,
        mergeDeep(this.state.crops, this.state.equipment, potentialEquipment),
        currentFarm,
        date
      );

      renderWateredSoilToContext(
        context,
        season === "winter" ? hoeDirtSnowImage : hoeDirtImage,
        mergeDeep(this.state.equipment, potentialEquipment),
        currentFarm,
        date
      );

      renderFlooringToContext(
        context,
        flooringImage,
        mergeDeep(this.state.equipment, potentialEquipment),
        date
      );

      if (this.state.mousePosition && this.props.selectedItem !== undefined) {
        const highlightedRegion = this.getHighlightedRegion();
        if (highlightedRegion === undefined) {
          return;
        }

        renderSelectedRegion(
          context,
          this.state.crops,
          this.state.equipment,
          currentFarm,
          date,
          highlightedRegion,
          highlightGreenImage,
          highlightGreyImage,
          highlightRedImage,
          equipmentImage,
          fenceImage,
          this.props.selectedItem
        );
      }

      renderItemsToContext(
        context,
        cropsImage,
        equipmentImage,
        fenceImage,
        mergeDeep(this.state.crops, this.state.equipment, potentialEquipment),
        date
      );
    }
  };
}

export default Farm;
