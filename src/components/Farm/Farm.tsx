import * as React from "react";

import {
  calculateStageOfCrop,
  getCropsLastDay,
  renderCrop
} from "../../helpers/crop";
import { getSeason } from "../../helpers/date";

import "./Farm.css";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../../data/sdv.json").crops;

// tslint:disable-next-line:no-var-requires
// const cropMap: string[] = require("../../data/crops.json");

interface IPlantedCrop {
  cropId: string;
  dayPlanted: number;
  x: number;
  y: number;
}

interface IProps {
  date: number;
  selectedCropId?: string;
  zoom: number;
}

interface IState {
  crops: IPlantedCrop[];
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
  public state: IState = { crops: [], isMouseDown: false };

  private canvas?: HTMLCanvasElement;
  private farmWidth = 80;
  private farmHeight = 65;

  public componentDidMount() {
    // const cropsToPlant: IPlantedCrop[] = [];
    // for (let i = 0; i < 80 * 60; i += 1) {
    //   const cropNumber = Math.floor(Math.random() * (cropMap.length - 1));
    //   const cropId = cropMap[cropNumber].toLowerCase().replace(/ /g, "_");
    //   const crop = crops.find(c => c.id === cropId);
    //   if (crop && crop.seasons.find(season => season === "spring")) {
    //     cropsToPlant.push({
    //       cropId,
    //       dayPlanted: 0,
    //       x: i % 80 + 1,
    //       y: Math.floor(i / 80) + 1
    //     });
    //   }
    // }
    // this.plantCrops(cropsToPlant);

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

  private calculateMousePosition = (event: React.MouseEvent<HTMLElement>) => {
    const { scaleX, scaleY } = this.getCanvasPositionAndScale();
    return { x: event.clientX * scaleX, y: event.clientY * scaleY };
  };

  private getCanvasImages(date: number) {
    const season = ["spring", "summer", "fall", "winter"][getSeason(date)];

    const createImage: HTMLImageElement | null = document.querySelector(
      `img[src="/images/create.png"]`
    );
    const backgroundImage: HTMLImageElement | null = document.querySelector(
      `img[src="/images/background-${season}.png"]`
    );
    const cropsImage: HTMLImageElement | null = document.querySelector(
      `img[src="/images/crops.png"]`
    );

    if (
      backgroundImage === null ||
      createImage === null ||
      cropsImage === null
    ) {
      throw new Error("Error loading images");
    }

    return { backgroundImage, createImage, cropsImage };
  }

  private getCanvasPositionAndScale = () => {
    if (this.canvas === undefined) {
      throw new Error();
    }

    const rect = this.canvas.getBoundingClientRect();
    const { left, top } = rect;

    const scaleX = this.canvas.width / (rect.right - rect.left);
    const scaleY = this.canvas.height / (rect.bottom - rect.top);

    return { left, top, scaleX, scaleY };
  };

  private onMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = this.getCanvasPositionAndScale();

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
    const { left, top, scaleX, scaleY } = this.getCanvasPositionAndScale();

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
    const cropsToPlant: IPlantedCrop[] = [];

    if (
      this.props.selectedCropId !== undefined &&
      this.state.mousePosition &&
      this.state.isMouseDown &&
      this.state.mouseDownPosition
    ) {
      const x1 = Math.floor(
        (this.state.mousePosition.x - this.state.mousePosition.left) / 16
      );
      const y1 = Math.floor(
        (this.state.mousePosition.y - this.state.mousePosition.top) / 16
      );
      const x2 = Math.floor(
        (this.state.mouseDownPosition.x - this.state.mouseDownPosition.left) /
          16
      );
      const y2 = Math.floor(
        (this.state.mouseDownPosition.y - this.state.mouseDownPosition.top) / 16
      );

      const xDirection = Math.sign(x2 - x1) || 1;
      const yDirection = Math.sign(y2 - y1) || 1;

      for (let y = y1; y !== y2 + yDirection; y += yDirection) {
        for (let x = x1; x !== x2 + xDirection; x += xDirection) {
          cropsToPlant.push({
            cropId: this.props.selectedCropId,
            dayPlanted: this.props.date,
            x,
            y
          });
        }
      }
    }

    this.plantCrops(cropsToPlant);

    this.setState({
      isMouseDown: false,
      mouseDownPosition: undefined
    });
  };

  private onScroll = (event: React.UIEvent<HTMLElement>) => {
    const { left, top, scaleX, scaleY } = this.getCanvasPositionAndScale();

    this.setState({
      mousePosition: {
        ...this.state.mousePosition,
        left: left * scaleX,
        top: top * scaleY
      }
    });
  };

  // private plantCrop = (
  //   cropId: string,
  //   dayPlanted: number,
  //   x: number,
  //   y: number
  // ) => {
  //   this.setState({
  //     crops: [...this.state.crops, { cropId, dayPlanted, x, y }]
  //   });
  // };

  private plantCrops = (cropsToPlant: IPlantedCrop[]) => {
    this.setState({
      crops: [...this.state.crops, ...cropsToPlant]
    });
  };

  private renderCrops = (
    context: CanvasRenderingContext2D,
    cropsImage: HTMLImageElement
  ) => {
    const { date } = this.props;

    const sortedCrops = this.state.crops.sort(
      (a, b) => a.x + a.y * this.farmWidth - (b.x + b.y * this.farmWidth)
    );

    sortedCrops.map(({ cropId, dayPlanted, x, y }, i) => {
      const crop = crops.find(c => c.id === cropId);

      if (crop === undefined) {
        return;
      }

      const cropsLastDay = getCropsLastDay(crop, dayPlanted);
      if (
        cropsLastDay === undefined ||
        date < dayPlanted ||
        date > cropsLastDay
      ) {
        return;
      }

      const stage = calculateStageOfCrop(
        date - dayPlanted + 1,
        crop.stages,
        crop.regrow
      );

      const spriteIndex = stage + 1;
      const isFlower = crop.isFlower && spriteIndex > crop.stages.length;

      renderCrop(context, cropsImage, stage + 1, x, y, crop.name, isFlower);
    });
  };

  private renderSelectedRegion = (
    context: CanvasRenderingContext2D,
    selectedRegionImage: HTMLImageElement
  ) => {
    if (this.state.mousePosition && this.props.selectedCropId !== undefined) {
      if (this.state.isMouseDown && this.state.mouseDownPosition) {
        const x1 = Math.floor(
          (this.state.mousePosition.x - this.state.mousePosition.left) / 16
        );
        const y1 = Math.floor(
          (this.state.mousePosition.y - this.state.mousePosition.top) / 16
        );
        const x2 = Math.floor(
          (this.state.mouseDownPosition.x - this.state.mouseDownPosition.left) /
            16
        );
        const y2 = Math.floor(
          (this.state.mouseDownPosition.y - this.state.mouseDownPosition.top) /
            16
        );

        const xDirection = Math.sign(x2 - x1) || 1;
        const yDirection = Math.sign(y2 - y1) || 1;

        for (let y = y1; y !== y2 + yDirection; y += yDirection) {
          for (let x = x1; x !== x2 + xDirection; x += xDirection) {
            context.drawImage(selectedRegionImage, x * 16, y * 16);
          }
        }
      } else {
        const x =
          Math.floor(
            (this.state.mousePosition.x - this.state.mousePosition.left) / 16
          ) * 16;
        const y =
          Math.floor(
            (this.state.mousePosition.y - this.state.mousePosition.top) / 16
          ) * 16;
        context.drawImage(selectedRegionImage, x, y);
      }
    }
  };

  private updateCanvas = () => {
    const { date } = this.props;

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

      const { backgroundImage, createImage, cropsImage } = this.getCanvasImages(
        date
      );

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      context.drawImage(backgroundImage, 0, 0);

      this.renderCrops(context, cropsImage);

      this.renderSelectedRegion(context, createImage);
    }
  };
}

export default Farm;
