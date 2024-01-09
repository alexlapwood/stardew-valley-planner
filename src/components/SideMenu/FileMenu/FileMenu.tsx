import cn from "clsx";

import { openFarm, saveFarm } from "../../../state/farm";
import BigText from "../../BigText/BigText";

interface IProps {
  isVisible: boolean;
}

export default function EquipmentMenu(props: IProps) {
  return (
    <div class={cn("EquipmentMenu", "sdv-list", !props.isVisible && "hidden")}>
      <div
        class={cn("sdv-list-item", "flex-horizontal")}
        onClick={() => {
          openFarm();
        }}
      >
        <div class="sdv-list-item-text flex margin-right">
          <BigText>Open</BigText>
        </div>
      </div>
      <div
        class={cn("sdv-list-item", "flex-horizontal")}
        onClick={() => {
          saveFarm();
        }}
      >
        <div class="sdv-list-item-text flex margin-right">
          <BigText>Save</BigText>
        </div>
      </div>
    </div>
  );
}
