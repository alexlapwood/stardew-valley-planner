import * as React from "react";

import DatePicker from "./components/DatePicker/DatePicker";
import Farm from "./components/Farm/Farm";
import ItemsMenu from "./components/ItemsMenu/ItemsMenu";
import Toolbar from "./components/Toolbar/Toolbar";

import { getSeason } from "./helpers/date";

// tslint:disable-next-line:no-var-requires
const crops: { [index: string]: ICrop } = require("./data/sdv.json").crops;

import "./App.css";

interface IProps {
  waitForImages?: boolean;
}

interface IState {
  date: number;
  images: HTMLImageElement[];
  isLoading: boolean;
  selectedItem?: ISelectedItem;
  toolbarsDisabled: boolean;
}

class App extends React.Component<IProps, IState> {
  public state: IState = {
    date: 0,
    images: [],
    isLoading: true,
    toolbarsDisabled: false
  };

  public async componentDidMount() {
    const imageUrls: string[] = [
      "images/background-spring.png",
      "images/background-summer.png",
      "images/background-fall.png",
      "images/background-winter.png",
      "images/crops.png",
      "images/highlight-green.png",
      "images/highlight-grey.png",
      "images/highlight-red.png",
      "images/pick-axe.png",
      "images/equipment.png",
      "images/hoeDirt.png",
      "images/hoeDirtSnow.png"
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
      selectedItem,
      toolbarsDisabled
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
              selectedItem={selectedItem}
              // tslint:disable-next-line:jsx-no-lambda
              disableToolbars={(disabled: boolean) => {
                this.setState({
                  toolbarsDisabled: disabled
                });
              }}
              zoom={1}
            />
            <Toolbar
              isDisabled={toolbarsDisabled}
              images={images}
              selectedItem={selectedItem}
              // tslint:disable-next-line:jsx-no-lambda
              selectTool={(toolId: string) => {
                this.setState({
                  selectedItem: { id: toolId, type: "tool" }
                });
              }}
            />
            <DatePicker
              changeDate={this.changeDate}
              date={date}
              isDisabled={toolbarsDisabled}
            />
          </div>
        </div>
        <div style={{ width: "168px" }}>
          <ItemsMenu
            date={date}
            // tslint:disable-next-line:jsx-no-lambda
            selectCrop={(cropId: string) => {
              this.setState({
                selectedItem: { id: cropId, type: "crop" }
              });
            }}
            // tslint:disable-next-line:jsx-no-lambda
            selectEquipment={(equipmentId: string) => {
              this.setState({
                selectedItem: { id: equipmentId, type: "equipment" }
              });
            }}
            selectedItem={selectedItem}
          />
        </div>
      </div>
    );
  }

  public changeDate = (date: number) => {
    const { selectedItem } = this.state;

    if (selectedItem === undefined || selectedItem.type !== "crop") {
      this.setState({ date });
      return;
    }

    const selectedCrop = crops[selectedItem.id];

    const keepSelectedItem =
      selectedCrop !== undefined &&
      selectedCrop.seasons.find(
        season =>
          season === ["spring", "summer", "fall", "winter"][getSeason(date)]
      );

    this.setState({
      date,
      selectedItem: keepSelectedItem ? selectedItem : undefined
    });
  };
}

export default App;
