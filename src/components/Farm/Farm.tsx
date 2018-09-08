import * as React from "react";

import { getCanvasPositionAndScale } from "../../helpers/canvas";
import { getSeason } from "../../helpers/date";
import {
  forEachTile,
  getCropsAtLocation,
  getEquipmentAtLocation
} from "../../helpers/farm";
import {
  checkCropsToPlant,
  checkEquipmentToInstall,
  findCropToDestroy,
  findEquipmentToDestroy
} from "../../helpers/itemPlacement";
import merge from "../../helpers/merge";
import {
  renderEquipmentBoundaries,
  renderItemsToContext,
  renderSelectedRegion
} from "../../helpers/renderToCanvas";

import "./Farm.css";

interface IProps {
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
      { currentCrops: this.state.crops, currentEquipment: this.state.equipment }
    );

    let newEquipment: IFarmEquipment = {};

    installableEquipment.forEach(equipmentToInstall => {
      newEquipment = merge(newEquipment, {
        [equipmentToInstall.y]: {
          [equipmentToInstall.x]: [equipmentToInstall]
        }
      });
    });

    this.setState({
      equipment: merge(this.state.equipment, newEquipment)
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
      forEachTile(highlightedRegion, (x, y) => {
        cropsToPlant.push({
          cropId: selectedItem.id,
          datePlanted: this.props.date,
          x,
          y
        });
      });

      this.plantCrops(cropsToPlant);
    }

    if (selectedItem.type === "equipment") {
      const equipmentToInstall: IInstalledEquipment[] = [];
      forEachTile(highlightedRegion, (x, y) => {
        equipmentToInstall.push({
          dateInstalled: this.props.date,
          equipmentId: selectedItem.id,
          x,
          y
        });
      });

      this.installEquipment(equipmentToInstall);
    }

    if (selectedItem.type === "tool") {
      if (selectedItem.id === "pick-axe") {
        const currentCrops: IFarmCrops = merge({}, this.state.crops);
        const currentEquipment: IFarmEquipment = merge(
          {},
          this.state.equipment
        );

        forEachTile(highlightedRegion, (x, y) => {
          const plantedCrops = getCropsAtLocation(currentCrops, x, y);
          const installedEquipment = getEquipmentAtLocation(
            currentEquipment,
            x,
            y
          );

          const cropToDestroy = findCropToDestroy(plantedCrops, date);
          const equipmentToDestroy = findEquipmentToDestroy(
            installedEquipment,
            date
          );

          if (cropToDestroy !== undefined) {
            currentCrops[y][x] = currentCrops[y][x].map(cropToCheck => {
              if (
                cropToCheck.cropId === cropToDestroy.cropId &&
                cropToCheck.datePlanted === cropToDestroy.datePlanted
              ) {
                cropToCheck.dateDestroyed = date;
              }
              return cropToCheck;
            });
          }

          if (equipmentToDestroy !== undefined) {
            currentEquipment[y][x] = currentEquipment[y][x].map(
              equipmentToCheck => {
                if (
                  equipmentToCheck.equipmentId ===
                    equipmentToDestroy.equipmentId &&
                  equipmentToCheck.dateInstalled ===
                    equipmentToDestroy.dateInstalled
                ) {
                  equipmentToCheck.dateDestroyed = date;
                }
                return equipmentToCheck;
              }
            );
          }
        });

        this.setState({
          crops: currentCrops,
          equipment: currentEquipment
        });
      }
    }

    if (this.props.disableToolbars !== undefined) {
      this.props.disableToolbars(false);
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
    const { plantableCrops } = checkCropsToPlant(cropsToPlant, {
      currentCrops: this.state.crops,
      currentEquipment: this.state.equipment
    });

    let newCrops: IFarmCrops = {};

    plantableCrops.forEach(cropToPlant => {
      newCrops = merge(newCrops, {
        [cropToPlant.y]: {
          [cropToPlant.x]: [cropToPlant]
        }
      });
    });

    this.setState({
      crops: merge(this.state.crops, newCrops)
    });
  };

  private updateCanvas = () => {
    const { date, images } = this.props;

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
        image.src.includes("/images/equipment.png")
      );
      const scarecrowBoundaryImage = images.find(image =>
        image.src.includes("/images/scarecrow-boundary.png")
      );
      const sprinklerBoundaryImage = images.find(image =>
        image.src.includes("/images/sprinkler-boundary.png")
      );

      if (
        backgroundImage === undefined ||
        highlightGreenImage === undefined ||
        highlightGreyImage === undefined ||
        highlightRedImage === undefined ||
        cropsImage === undefined ||
        equipmentImage === undefined ||
        scarecrowBoundaryImage === undefined ||
        sprinklerBoundaryImage === undefined
      ) {
        throw new Error("Error loading images");
      }

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      context.drawImage(backgroundImage, 0, 0);

      renderEquipmentBoundaries(
        context,
        {
          scarecrow: scarecrowBoundaryImage,
          sprinkler: sprinklerBoundaryImage
        },
        this.state.equipment,
        date
      );

      renderItemsToContext(
        context,
        cropsImage,
        equipmentImage,
        this.state.crops,
        this.state.equipment,
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
          date,
          highlightedRegion,
          highlightGreenImage,
          highlightGreyImage,
          highlightRedImage,
          equipmentImage,
          {
            scarecrow: scarecrowBoundaryImage,
            sprinkler: sprinklerBoundaryImage
          },
          this.props.selectedItem
        );
      }
    }
  };
}

export default Farm;
