import * as React from "react";

import Farm from "./components/Farm/Farm";

import { getDay, getSeason, getYear } from "./helpers/date";

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
        <Farm day={day} />
        <br />
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
    );
  }

  private changeDay = (day: number) => {
    this.setState({
      day
    });
  };
}

export default App;
