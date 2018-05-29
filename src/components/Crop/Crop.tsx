import * as React from "react";

import Sprite from "../Sprite/Sprite";

interface IProps {
  age: number;
  id: string;
  isFlower?: boolean;
  name: string;
  regrow?: number;
  stages: number[];
  x: number;
  y: number;
}

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

class Crop extends React.Component<IProps> {
  public render() {
    const { age, isFlower, name, regrow, stages, x, y } = this.props;

    const stage = this.calculateStageOfCrop(age, stages, regrow);

    if (stage === undefined) {
      console.log("This should never happen");
      return <div />;
    }

    const spriteIndex = stage + 1;

    return (
      <div
        style={{
          left: `${x * 16}px`,
          position: "absolute",
          top: `${(y - 1) * 16}px`
        }}
      >
        <div style={{ display: "block", position: "relative" }}>
          <Sprite
            height={32}
            src="/images/crops.png"
            width={16}
            x={spriteIndex * 16}
            y={cropMap.indexOf(name) * 32}
          />
          {isFlower &&
            spriteIndex > stages.length && (
              <div style={{ position: "absolute", top: 0 }}>
                <Sprite
                  height={32}
                  src="/images/crops.png"
                  width={16}
                  x={(spriteIndex + 1) * 16}
                  y={cropMap.indexOf(name) * 32}
                />
              </div>
            )}
        </div>
      </div>
    );
  }

  public calculateStageOfCrop(age: number, stages: number[], regrow?: number) {
    let stage = 0;
    let day = 0;

    while (age > day + stages[stage] && stages[stage] !== undefined) {
      day += stages[stage];
      stage += 1;
    }

    if (age > day + 1 && stages[stage] === undefined) {
      day += 1;
      stage += 1;
    }

    if (stage > stages.length) {
      if (regrow !== undefined) {
        const daysSinceLastHarvest = (age - day) % regrow;
        return daysSinceLastHarvest === 0 ? stage - 1 : stage;
      }

      return;
    }

    return stage;
  }
}

export default Crop;
