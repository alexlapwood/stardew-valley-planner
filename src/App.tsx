import * as React from "react";

import BigText from "./components/BigText/BigText";
import DatePicker from "./components/DatePicker/DatePicker";
import Farm from "./components/Farm/Farm";
import Menu from "./components/Menu/Menu";
import Sprite from "./components/Sprite/Sprite";
import Toolbar from "./components/Toolbar/Toolbar";

import { getSeason } from "./helpers/date";

import "./App.css";

// tslint:disable-next-line:no-var-requires
const crops: ICrop[] = require("./data/sdv.json").crops;

interface IState {
  date: number;
}

class App extends React.Component {
  public state: IState = {
    date: 0
  };

  public render() {
    const { date } = this.state;
    return (
      <div className="App flex-horizontal">
        <div className="flex-vertical flex overflow-hidden">
          <Menu menuItems={["New", "Open", "Save", "Share", "Options"]} />
          <div className="relative flex overflow-hidden">
            <Farm date={date} zoom={1} />
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
                  <div className="sdv-list-item" key={crop.id}>
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

  private changeDate = (date: number) => {
    this.setState({
      date
    });
  };
}

export default App;
