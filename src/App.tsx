import * as React from "react";

import Farm from "./components/Farm/Farm";
import Menu from "./components/Menu/Menu";
import Toolbar from "./components/Toolbar/Toolbar";

import { getDay, getSeason, getYear } from "./helpers/date";

import "./App.css";

interface IState {
  day: number;
}

class App extends React.Component {
  public state: IState = {
    day: 1
  };

  public render() {
    const { day } = this.state;
    return (
      <div className="App">
        <Menu menuItems={["New", "Open", "Save", "Share", "Options"]} />
        <div className="DatePicker">
          Day {getDay(day)} of{" "}
          {["Spring", "Summer", "Fall", "Winter"][getSeason(day)]} Year{" "}
          {getYear(day)}
          <input
            type="number"
            onChange={
              // tslint:disable-next-line:jsx-no-lambda
              e => this.changeDay(Number(e.target.value))
            }
          />
        </div>
        <div className="MainWindow">
          <Farm day={day} />
          <Toolbar />
        </div>
      </div>
    );
  }

  private changeDay = (day: number) => {
    this.setState({
      day
    });
  };
}

export default App;
