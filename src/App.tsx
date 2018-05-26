import * as React from "react";

import Crop from "./components/Crop/Crop";

// tslint:disable-next-line:no-var-requires
const { crops }: ISDVData = require("./data/sdv.json");

interface ISDVData {
  crops: ICrop[];
}

class App extends React.Component {
  public state = {
    day: 1
  };

  public render() {
    return (
      <div className="App">
        {crops.map(crop => (
          <Crop key={crop.id} {...crop} age={this.state.day} />
        ))}

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
