import BigButton from "../../BigButton/BigButton";

interface IProps {
  changeSeason: (season: number) => void;
  season: number;
}

export default function SeasonPicker(props: IProps) {
  return (
    <div class="DatePicker--season flex-horizontal">
      <BigButton
        data-testid="DatePicker--season-spring"
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => props.changeSeason(0)}
        selected={props.season === 0}
      >
        Spring
      </BigButton>
      <BigButton
        data-testid="DatePicker--season-summer"
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => props.changeSeason(1)}
        selected={props.season === 1}
      >
        Summer
      </BigButton>
      <BigButton
        data-testid="DatePicker--season-fall"
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => props.changeSeason(2)}
        selected={props.season === 2}
      >
        Fall
      </BigButton>
      <BigButton
        data-testid="DatePicker--season-winter"
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => props.changeSeason(3)}
        selected={props.season === 3}
      >
        Winter
      </BigButton>
    </div>
  );
}
