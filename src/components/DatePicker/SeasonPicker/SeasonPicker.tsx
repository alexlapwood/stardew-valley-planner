import * as React from "react";

import BigButton from "../../BigButton/BigButton";

interface IProps {
  changeSeason: (season: number) => void;
  season: number;
}

const SeasonPicker: React.SFC<IProps> = props => (
  <div className="DatePicker--season flex-horizontal">
    <BigButton
      selected={props.season === 0}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(0)}
    >
      Spring
    </BigButton>
    <BigButton
      selected={props.season === 1}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(1)}
    >
      Summer
    </BigButton>
    <BigButton
      selected={props.season === 2}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(2)}
    >
      Fall
    </BigButton>
    <BigButton
      selected={props.season === 3}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(3)}
    >
      Winter
    </BigButton>
  </div>
);

export default SeasonPicker;
