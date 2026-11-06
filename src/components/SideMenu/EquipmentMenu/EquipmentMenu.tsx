import { For } from "solid-js";

import EquipmentMenuItem from "./EquipmentMenuItem/EquipmentMenuItem";

interface IProps {
  date: number;
  equipmentIds: string[];
  openDropdownId?: string;
  search?: string;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectedItem?: ISelectedItem;
  setOpenDropdownId: (equipmentId: string | undefined) => void;
  // A search hides the other rows instead of removing them, so each row keeps
  // its picked skin.
  shownIds?: ReadonlySet<string>;
}

export default function EquipmentMenu(props: IProps) {
  return (
    <div class="EquipmentMenu">
      <For each={props.equipmentIds}>
        {(equipmentId) => (
          <EquipmentMenuItem
            date={props.date}
            equipmentId={equipmentId}
            isHidden={props.shownIds?.has(equipmentId) === false}
            isOpen={props.openDropdownId === equipmentId}
            search={props.search}
            selectEquipment={props.selectEquipment}
            selectedItem={props.selectedItem}
            setIsOpen={(isOpen) => {
              props.setOpenDropdownId(isOpen ? equipmentId : undefined);
            }}
          />
        )}
      </For>
    </div>
  );
}
