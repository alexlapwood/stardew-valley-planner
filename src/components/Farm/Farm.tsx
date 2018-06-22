import * as React from "react";

import * as deepExtend from "deep-extend";

import { getCanvasPositionAndScale } from "../../helpers/canvas";
import { checkCropsToPlant } from "../../helpers/crop";
import { getSeason } from "../../helpers/date";
import {
  renderCropsToContext,
  renderSelectedRegion
} from "../../helpers/renderToCanvas";

import "./Farm.css";
interface IProps {
  date: number;
  images: HTMLImageElement[];
  selectedItem?: ISelectedItem;
  zoom: number;
}

interface IState {
  crops: IFarmCrops;
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
  public state: IState = { crops: {}, isMouseDown: false };

  public canvas?: HTMLCanvasElement;
  private farmWidth = 80;
  private farmHeight = 65;

  public componentDidMount() {
    this.updateCanvas();
  }

  public render() {
    const { zoom } = this.props;

    this.updateCanvas();

    return (
      <div className="Farm" onScroll={this.onScroll}>
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

  private onMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      this.canvas
    );

    const { x, y } = this.calculateMousePosition(event);

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
    this.setState({
      isMouseDown: false,
      mouseDownPosition: undefined,
      mousePosition: undefined
    });
  };

  private onMouseUp = () => {
    if (
      this.state.isMouseDown === false ||
      this.props.selectedItem === undefined
    ) {
      return;
    }
    const highlightedRegion = this.getHighlightedRegion();
    if (highlightedRegion === undefined) {
      return;
    }

    const { x1, y1, x2, y2 } = highlightedRegion;

    const xDirection = Math.sign(x2 - x1) || 1;
    const yDirection = Math.sign(y2 - y1) || 1;

    if (this.props.selectedItem.type === "crop") {
      const cropsToPlant: IPlantedCrop[] = [];
      for (let y = y1; y !== y2 + yDirection; y += yDirection) {
        for (let x = x1; x !== x2 + xDirection; x += xDirection) {
          cropsToPlant.push({
            cropId: this.props.selectedItem.id,
            datePlanted: this.props.date,
            x,
            y
          });
        }
      }

      this.plantCrops(cropsToPlant);
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
      this.state.crops
    );

    const newCrops = this.state.crops;

    plantableCrops.forEach(cropToPlant => {
      if (newCrops[cropToPlant.y] === undefined) {
        newCrops[cropToPlant.y] = {};
      }

      if (newCrops[cropToPlant.y][cropToPlant.x] === undefined) {
        newCrops[cropToPlant.y][cropToPlant.x] = [];
      }

      deepExtend(newCrops, {
        [cropToPlant.y]: {
          [cropToPlant.x]: [
            ...newCrops[cropToPlant.y][cropToPlant.x],
            cropToPlant
          ]
        }
      });
    });

    this.setState({
      crops: deepExtend(this.state.crops, newCrops)
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

      if (
        backgroundImage === undefined ||
        highlightGreenImage === undefined ||
        highlightGreyImage === undefined ||
        highlightRedImage === undefined ||
        cropsImage === undefined
      ) {
        throw new Error("Error loading images");
      }

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      context.drawImage(backgroundImage, 0, 0);

      renderCropsToContext(context, cropsImage, this.state.crops, date);

      if (this.state.mousePosition && this.props.selectedItem !== undefined) {
        const highlightedRegion = this.getHighlightedRegion();
        if (highlightedRegion === undefined) {
          return;
        }

        renderSelectedRegion(
          context,
          this.state.crops,
          date,
          highlightedRegion,
          highlightGreenImage,
          highlightGreyImage,
          highlightRedImage,
          this.props.selectedItem
        );
      }
    }
  };
}

export default Farm;
