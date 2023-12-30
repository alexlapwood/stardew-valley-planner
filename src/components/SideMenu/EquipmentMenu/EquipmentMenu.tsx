import cn from "clsx";
import { createSignal, For } from "solid-js";

import { equipmentIds } from "../../../data/sdv.json";
import EquipmentMenuItem from "./EquipmentMenuItem/EquipmentMenuItem";

interface IProps {
  date: number;
  isVisible: boolean;
  range?: { from?: number; to?: number };
  selectEquipment: (equipmentId: string, skinIndex: number) => void;
  selectedItem?: ISelectedItem;
}

export default function EquipmentMenu(props: IProps) {
  const [currentSkins, setCurrentSkins] = createSignal<{
    [index: string]: number;
  }>({});

  return (
    <div class={cn("EquipmentMenu", "sdv-list", !props.isVisible && "hidden")}>
      <For
        each={equipmentIds.filter((_, i) => {
          if (props.range !== undefined) {
            if (props.range.from !== undefined && i < props.range.from) {
              return false;
            }
            if (props.range.to !== undefined && i > props.range.to) {
              return false;
            }
          }
          return true;
        })}
      >
        {(equipmentId) => (
          <EquipmentMenuItem
            date={props.date}
            equipmentId={equipmentId}
            selectEquipment={(equipmentId: string, skinIndex: number) => {
              setCurrentSkins({
                ...currentSkins(),
                [equipmentId]: skinIndex,
              });

              props.selectEquipment(equipmentId, skinIndex);
            }}
            selectedItem={props.selectedItem}
          />
        )}
      </For>
    </div>
  );
}
