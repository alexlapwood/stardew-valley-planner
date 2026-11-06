import { createCtrlKey } from "../../../helpers/keyboard";
import HeaderButton, { type TGrowFrom } from "../HeaderButton/HeaderButton";

interface IProps {
  growFrom: TGrowFrom;
  openFile: () => void;
  testId: string;
}

export default function OpenButton(props: IProps) {
  createCtrlKey("o", () => {
    props.openFile();
  });

  return (
    <HeaderButton
      growFrom={props.growFrom}
      icon="📂"
      label="Open"
      onClick={() => {
        props.openFile();
      }}
      testId={props.testId}
    />
  );
}
