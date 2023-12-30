import BigText from "../../BigText/BigText";

interface IProps {
  addYear: () => void;
  subtractYear: () => void;
  year: number;
}

export default function YearPicker(props: IProps) {
  return (
    <div class="flex-horizontal flex">
      <div class="flex" />
      <div class="sdv-panel-big">
        <div class="DatePicker--year flex-horizontal">
          <button
            class="sdv-button-subtract"
            data-testid="DatePicker--year-subtract"
            disabled={props.year === 0}
            onClick={() => props.subtractYear()}
          />
          <div class="DatePicker--year-text" style={{ display: "block" }}>
            <BigText>Year {String(props.year + 1)}</BigText>
          </div>
          <button
            class="sdv-button-add"
            data-testid="DatePicker--year-add"
            onClick={() => props.addYear()}
          />
        </div>
      </div>
      <div class="flex" />
    </div>
  );
}
