import * as React from "react";

import Crop from "../Crop/Crop";

import { getCropsLastDay } from "../../helpers/date";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("../../data/sdv.json").crops;

const cropMap = [
  "Amaranth",
  "Ancient Fruit",
  "Artichoke",
  "Beet",
  "Blue Jazz",
  "Blueberry",
  "Bok Choy",
  "Cauliflower",
  "Corn",
  "Cranberry",
  "Eggplant",
  "Fairy Rose",
  "Garlic",
  "Grape",
  "Green Bean",
  "Hops",
  "Hot Pepper",
  "Kale",
  "Melon",
  "Parsnip",
  "Poppy",
  "Potato",
  "Pumpkin",
  "Radish",
  "Red Cabbage",
  "Rhubarb",
  "Starfruit",
  "Strawberry",
  "Summer Spangle",
  "Sunflower",
  "Sweet Gem Berry",
  "Tomato",
  "Tulip",
  "Wheat",
  "Yam"
];

interface IPlantedCrop {
  cropId: string;
  dayPlanted: number;
  x: number;
  y: number;
}

interface IProps {
  day: number;
}

interface IState {
  crops: IPlantedCrop[];
}

class App extends React.Component<IProps> {
  public state: IState = { crops: [] };

  public async componentDidMount() {
    for (let i = 0; i < 100; i += 1) {
      const cropName = Math.floor(Math.random() * (cropMap.length - 1));

      await this.plantCrop(
        cropMap[cropName].toLowerCase().replace(/ /g, "_"),
        1,
        i % 10,
        Math.floor(i / 10)
      );
    }
  }

  public render() {
    const { day } = this.props;

    const cropsToRender = this.state.crops
      .sort((a, b) => a.y - b.y)
      .map(({ cropId, dayPlanted, x, y }, i) => {
        const crop = crops.find(c => c.id === cropId);

        if (crop === undefined || day < dayPlanted) {
          return;
        }

        const cropsLastDay = getCropsLastDay(crop, dayPlanted);
        if (cropsLastDay === undefined || day > cropsLastDay) {
          return;
        }

        return (
          <Crop key={i} {...crop} {...{ x, y }} age={day - dayPlanted + 1} />
        );
      });

    return <div className="Farm">{cropsToRender}</div>;
  }

  private plantCrop = (
    cropId: string,
    dayPlanted: number,
    x: number,
    y: number
  ) => {
    return new Promise((resolve, reject) => {
      this.setState(
        {
          crops: [...this.state.crops, { cropId, dayPlanted, x, y }]
        },
        () => resolve()
      );
    });
  };
}

export default App;
