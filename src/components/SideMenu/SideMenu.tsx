import "./SideMenu.css";

import cn from "clsx";
import { createSignal } from "solid-js";

import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import { atlasSprite } from "../../helpers/atlas";
import BigText from "../BigText/BigText";
import Sprite from "../Sprite/Sprite";
import EquipmentMenu from "./EquipmentMenu/EquipmentMenu";
import { itemTabs } from "./EquipmentMenu/itemTabs";
import FileMenu from "./FileMenu/FileMenu";
import SeedMenu from "./SeedMenu/SeedMenu";

type TCurrentMenu = "seeds" | "equipment" | "decorations" | "file";

interface IProps {
  date: number;
  selectCrop: (cropId: string) => void;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectedItem?: ISelectedItem;
}

function getDefaultIcon(itemId: string): TSpriteRect {
  const item = items[itemId];

  return item.skins[item.skinOrder[0]]?.icon ?? [0, 0, 0, 0];
}

const [scarecrowX, scarecrowY] = getDefaultIcon("scarecrow");
const [plantX, plantY, , plantHeight] = getDefaultIcon("seasonal_plant");

const tabIcons: Record<"decorations" | "equipment" | "seeds", TSpriteRect> = {
  decorations: [plantX, plantY + plantHeight - 16, 16, 16],
  equipment: [scarecrowX, scarecrowY, 16, 16],
  seeds: crops.ancient_fruit.sprites.seed,
};

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

  const showFile = () => {
    setCurrentMenu("file");
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
          <Sprite {...atlasSprite("crops", tabIcons.seeds)} />
        </div>
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "equipment",
          })}
          data-testid="equipment-tab"
          onClick={showEquipment}
        >
          <Sprite {...atlasSprite("items", tabIcons.equipment)} />
        </div>
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "decorations",
          })}
          data-testid="decorations-tab"
          onClick={showDecorations}
        >
          <Sprite {...atlasSprite("items", tabIcons.decorations)} />
        </div>
        <div
          class={cn("sdv-tab", {
            selected: currentMenu() === "file",
          })}
          data-testid="file-tab"
          onClick={showFile}
        >
          <BigText>File</BigText>
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
        equipmentIds={itemTabs.equipment}
        isVisible={currentMenu() === "equipment"}
        selectEquipment={props.selectEquipment}
        selectedItem={props.selectedItem}
      />
      <EquipmentMenu
        date={props.date}
        equipmentIds={itemTabs.decorations}
        isVisible={currentMenu() === "decorations"}
        selectEquipment={props.selectEquipment}
        selectedItem={props.selectedItem}
      />
      <FileMenu isVisible={currentMenu() === "file"} />
    </div>
  );
}
