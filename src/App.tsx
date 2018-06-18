import * as React from "react";

import DatePicker from "./components/DatePicker/DatePicker";
import Farm from "./components/Farm/Farm";
import ItemsMenu from "./components/ItemsMenu/ItemsMenu";
import Toolbar from "./components/Toolbar/Toolbar";

import { getSeason } from "./helpers/date";

import "./App.css";

interface IProps {
  waitForImages?: boolean;
}

interface IState {
  date: number;
  images: HTMLImageElement[];
  isLoading: boolean;
  selectedCropId?: string;
  selectedToolId?: string;
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
      "/images/destroy.png",
      "/images/pick-axe.png"
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
    const {
      date,
      images,
      isLoading,
      selectedCropId,
      selectedToolId
    } = this.state;
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
            <Toolbar
              images={images}
              selectedToolId={selectedToolId}
              // tslint:disable-next-line:jsx-no-lambda
              selectTool={(toolId: string) => {
                this.setState({
                  selectedCropId: undefined,
                  selectedToolId: toolId
                });
              }}
            />
            <DatePicker date={date} changeDate={this.changeDate} />
          </div>
        </div>
        <div style={{ width: "168px" }}>
          <ItemsMenu
            date={date}
            // tslint:disable-next-line:jsx-no-lambda
            selectCrop={(cropId: string) => {
              this.setState({
                selectedCropId: cropId,
                selectedToolId: undefined
              });
            }}
            selectedCropId={selectedCropId}
          />
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
