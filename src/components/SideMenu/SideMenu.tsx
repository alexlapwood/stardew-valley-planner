import "./SideMenu.css";

import cn from "clsx";
import { createSignal } from "solid-js";

import Sprite from "../Sprite/Sprite";
import EquipmentMenu from "./EquipmentMenu/EquipmentMenu";
import SeedMenu from "./SeedMenu/SeedMenu";

type TCurrentMenu = "seeds" | "equipment" | "decorations";

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectEquipment: (equipmentId: string, equipmentIndex: number) => void;
  selectedItem?: ISelectedItem;
}

export default function SideMenu(props: IProps) {
  const [currentMenu, setCurrentMenu] = createSignal<TCurrentMenu>("seeds");

  const showCrops = () => {
    setCurrentMenu("seeds");
  };

  const showEquipment = () => {
    setCurrentMenu("equipment");
  };

  const showDecorations = () => {
    setCurrentMenu("decorations");
  };

  return (
    <div class="SideMenu flex-vertical">
      <div class="flex-horizontal flex-no-shrink">
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "seeds",
          })}
          data-testid="seeds-tab"
          onClick={showCrops}
        >
          <Sprite height={16} src="images/seeds.png" width={16} x={16} y={0} />
        </div>
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "equipment",
          })}
          data-testid="equipment-tab"
          onClick={showEquipment}
        >
          <Sprite
            height={16}
            src="images/equipment-sheet.png"
            width={16}
            x={0}
            y={0}
          />
        </div>
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "decorations",
          })}
          data-testid="decorations-tab"
          onClick={showDecorations}
        >
          <Sprite
            height={16}
            src="images/equipment-sheet.png"
            width={16}
            x={960}
            y={16}
          />
        </div>
      </div>
      <SeedMenu
        date={props.date}
        isVisible={currentMenu() === "seeds"}
        selectCrop={props.selectCrop}
        selectedItem={props.selectedItem}
      />
      <EquipmentMenu
        date={props.date}
        isVisible={currentMenu() === "equipment"}
        range={{ to: 22 }}
        selectEquipment={props.selectEquipment}
        selectedItem={props.selectedItem}
      />
      <EquipmentMenu
        date={props.date}
        isVisible={currentMenu() === "decorations"}
        range={{ from: 23 }}
        selectEquipment={props.selectEquipment}
        selectedItem={props.selectedItem}
      />
    </div>
  );
}
