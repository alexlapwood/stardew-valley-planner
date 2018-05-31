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
  zoom: number;
}

interface IState {
  crops: IPlantedCrop[];
}

class App extends React.Component<IProps> {
  public state: IState = { crops: [] };

  private canvas?: HTMLCanvasElement;

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
      <div className="Farm">
        <div
          className="Farm--canvas-wrapper"
          style={{ transform: `scale(${zoom})` }}
        >
          <canvas
            className="Farm--canvas"
            height={65 * 16}
            ref={ref => {
              if (ref !== null) {
                this.canvas = ref;
              }
            }}
            width={80 * 16}
          />
        </div>
      </div>
    );
  }

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

  // private plantCrops = (cropsToPlant: IPlantedCrop[]) => {
  //   this.setState({
  //     crops: [...this.state.crops, ...cropsToPlant]
  //   });
  // };

  private updateCanvas = () => {
    const { date } = this.props;

    if (this.canvas) {
      const canvasHeight = this.canvas.height;
      const canvasWidth = this.canvas.width;
      const context = this.canvas.getContext("2d");

      if (context === null) {
        throw new Error("Could not get context for canvas");
      }

      context.mozImageSmoothingEnabled = false;
      context.webkitImageSmoothingEnabled = false;
      context.oImageSmoothingEnabled = false;
      context.imageSmoothingEnabled = false;

      const sprite = new Image();
      sprite.src = "/images/crops.png";
      sprite.onload = () => {
        if (this.canvas === null || context === null) {
          return;
        }

        context.clearRect(0, 0, canvasWidth, canvasHeight);

        const season = ["spring", "summer", "fall", "winter"][getSeason(date)];

        const background: HTMLImageElement | null = document.querySelector(
          `img[src="/images/background-${season}.png"]`
        );

        if (background !== null) {
          context.drawImage(background, 0, 0);
        }

        const sortedCrops = this.state.crops.sort(
          (a, b) =>
            a.x + a.y * canvasWidth / 16 - (b.x + b.y * canvasWidth / 16)
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

          renderCrop(context, sprite, stage + 1, x, y, crop.name, isFlower);
        });
      };
    }
  };
}

export default App;
