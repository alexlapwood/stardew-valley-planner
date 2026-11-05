import cn from "clsx";
import { For } from "solid-js";

import EquipmentMenuItem from "./EquipmentMenuItem/EquipmentMenuItem";

interface IProps {
  date: number;
  equipmentIds: string[];
  isVisible: boolean;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectedItem?: ISelectedItem;
}

export default function EquipmentMenu(props: IProps) {
  return (
    <div class={cn("EquipmentMenu", "sdv-list", !props.isVisible && "hidden")}>
      <For each={props.equipmentIds}>
        {(equipmentId) => (
          <EquipmentMenuItem
            date={props.date}
            equipmentId={equipmentId}
            selectEquipment={props.selectEquipment}
            selectedItem={props.selectedItem}
          />
        )}
      </For>
    </div>
  );
}
