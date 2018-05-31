import * as React from "react";

import DatePicker from "./components/DatePicker/DatePicker";
import Farm from "./components/Farm/Farm";
import Menu from "./components/Menu/Menu";
import Toolbar from "./components/Toolbar/Toolbar";

import "./App.css";

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
        <div style={{ width: "128px" }}>
          <div className="sdv-panel-big">
            <div style={{ margin: "-5px 0" }}>Box</div>
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
