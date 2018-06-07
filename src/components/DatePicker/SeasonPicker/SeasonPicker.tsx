import * as React from "react";

import BigButton from "../../BigButton/BigButton";

interface IProps {
  changeSeason: (season: number) => void;
  season: number;
}

const SeasonPicker: React.SFC<IProps> = props => (
  <div className="DatePicker--season flex-horizontal">
    <BigButton
      data-automation-id="DatePicker--season-spring"
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(0)}
      selected={props.season === 0}
    >
      Spring
    </BigButton>
    <BigButton
      data-automation-id="DatePicker--season-summer"
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(1)}
      selected={props.season === 1}
    >
      Summer
    </BigButton>
    <BigButton
      data-automation-id="DatePicker--season-fall"
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(2)}
      selected={props.season === 2}
    >
      Fall
    </BigButton>
    <BigButton
      data-automation-id="DatePicker--season-winter"
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => props.changeSeason(3)}
      selected={props.season === 3}
    >
      Winter
    </BigButton>
  </div>
);

export default SeasonPicker;
