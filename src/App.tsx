import * as React from "react";

import * as cn from "classnames";

import BigText from "./components/BigText/BigText";
import DatePicker from "./components/DatePicker/DatePicker";
import Farm from "./components/Farm/Farm";
import Sprite from "./components/Sprite/Sprite";
import Toolbar from "./components/Toolbar/Toolbar";

import { getSeason } from "./helpers/date";

import "./App.css";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("./data/sdv.json").crops;

interface IProps {
  waitForImages?: boolean;
}

interface IState {
  date: number;
  images: HTMLImageElement[];
  isLoading: boolean;
  selectedCropId?: string;
}

class App extends React.Component<IProps, IState> {
  public state: IState = {
    date: 0,
    images: [],
    isLoading: true
  };

  public async componentDidMount() {
    const imageUrls: string[] = [
      "/images/background-spring.png",
      "/images/background-summer.png",
      "/images/background-fall.png",
      "/images/background-winter.png",
      "/images/create.png",
      "/images/crops.png",
      "/images/destroy.png"
    ];

    const imagePromises = imageUrls.map(async imageUrl => {
      const image = new Image();
      image.src = imageUrl;
      if (this.props.waitForImages === true) {
        await new Promise((resolve, reject) => {
          image.onerror = () => {
            reject();
          };
          image.onload = () => {
            resolve();
          };
        });
      }
      return image;
    });

    const images = await Promise.all(imagePromises);

    this.setState({
      images,
      isLoading: false
    });
  }

  public render() {
    const { date, images, isLoading, selectedCropId } = this.state;
    if (isLoading) {
      return <div>loading...</div>;
    }

    return (
      <div className="App flex-horizontal">
        <div className="flex-vertical flex overflow-hidden">
          <div className="relative flex overflow-hidden">
            <Farm
              date={date}
              images={images}
              selectedCropId={selectedCropId}
              zoom={1}
            />
            <Toolbar />
            <DatePicker date={date} changeDate={this.changeDate} />
          </div>
        </div>
        <div style={{ width: "168px" }}>
          <div className="sdv-list">
            {crops.map((crop, i) => {
              if (
                crop &&
                crop.seasons.find(
                  season =>
                    season ===
                    ["spring", "summer", "fall", "winter"][getSeason(date)]
                )
              ) {
                return (
                  <div
                    className={cn("sdv-list-item", {
                      selected: crop.id === selectedCropId
                    })}
                    key={crop.id}
                    // tslint:disable-next-line:jsx-no-lambda
                    onClick={() => {
                      this.setState({ selectedCropId: crop.id });
                    }}
                  >
                    <div className="sdv-list-item-icon">
                      <Sprite
                        height={16}
                        src="/images/seeds.png"
                        width={16}
                        x={i * 16}
                        y={0}
                      />
                    </div>
                    <div className="sdv-list-item-text">
                      <BigText>{crop.name}</BigText>
                    </div>
                  </div>
                );
              }
              return;
            })}
          </div>
        </div>
      </div>
    );
  }

  public changeDate = (date: number) => {
    const selectedCropId =
      getSeason(date) === getSeason(this.state.date)
        ? this.state.selectedCropId
        : undefined;

    this.setState({
      date,
      selectedCropId
    });
  };
}

export default App;
