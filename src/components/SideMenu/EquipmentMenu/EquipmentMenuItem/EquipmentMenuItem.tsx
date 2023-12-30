import cn from "clsx";
import { createSignal, JSXElement } from "solid-js";

import { equipment, equipmentIds } from "../../../../data/sdv.json";
import { getSeason } from "../../../../helpers/date";
import BigText from "../../../BigText/BigText";
import Sprite from "../../../Sprite/Sprite";

interface IProps {
  date: number;
  equipmentId: string;
  selectEquipment: (equipmentId: string, skinIndex: number) => void;
  selectedItem?: ISelectedItem;
}

export default function EquipmentMenuItem(props: IProps) {
  const [currentSkinIndex, setCurrentSkinIndex] = createSignal(0);
  const [isOpen, setIsOpen] = createSignal(false);

  const close = () => {
    setIsOpen(false);
  };

  const open = () => {
    setIsOpen(true);
  };

  const toggle = () => {
    if (isOpen()) {
      close();
    } else {
      open();
    }
  };

  const renderPicklist = () =>
    equipment[props.equipmentId].skins.map((skinId, skinIndex) => (
      <div class="margin-left">{renderPickItem(skinIndex)}</div>
    ));

  const renderPickItem = (skinIndex: number, isTrigger?: boolean) => {
    let sprite: JSXElement;

    let equipmentIndex = equipmentIds
      .slice(0, equipmentIds.indexOf(props.equipmentId))
      .reduce((acc, id) => {
        if (id === "fence" || id === "flooring") {
          return acc;
        }

        if (equipment[id].isSeasonal) {
          return acc + equipment[id].skins.length * 4;
        }

        return acc + equipment[id].skins.length;
      }, 0);

    if (equipment[props.equipmentId].isSeasonal) {
      equipmentIndex = equipmentIndex + skinIndex * 4 + getSeason(props.date);
    } else {
      equipmentIndex = equipmentIndex + skinIndex;
    }

    switch (props.equipmentId) {
      case "sprinkler":
        sprite = (
          <Sprite
            height={16}
            src="images/equipment-sheet.png"
            width={16}
            x={equipmentIndex * 16}
            y={16}
          />
        );
        break;
      case "fence":
        sprite = (
          <div
            style={{
              height: "16px",
              transform: "scale(0.5)",
              "transform-origin": "top left",
              "white-space": "nowrap",
              width: "16px",
            }}
          >
            <Sprite
              height={32}
              src="images/fences.png"
              width={16}
              x={skinIndex * 48}
              y={0}
            />
            <Sprite
              height={32}
              src="images/fences.png"
              width={16}
              x={skinIndex * 48 + 32}
              y={0}
            />
          </div>
        );
        break;
      case "flooring":
        sprite = (
          <div>
            <Sprite
              height={16}
              src="images/flooring.png"
              width={16}
              x={(skinIndex % 4) * 64}
              y={Math.floor(skinIndex / 4) * 64}
            />
          </div>
        );
        break;
      default:
        sprite = (
          <div
            style={{
              height: "16px",
              transform: "scale(0.5)",
              "transform-origin": "top center",
              "white-space": "nowrap",
              width: "16px",
            }}
          >
            <Sprite
              height={32}
              src="images/equipment-sheet.png"
              width={16}
              x={equipmentIndex * 16}
              y={0}
            />
          </div>
        );
        break;
    }
    return (
      <div
        class={cn("sdv-list-item", "flex-horizontal", {
          selected:
            props.selectedItem !== undefined &&
            props.selectedItem.type === "equipment" &&
            props.selectedItem.id === props.equipmentId &&
            props.selectedItem.skinIndex === skinIndex,
        })}
        data-testid={`equipment-${props.equipmentId}--${skinIndex}`}
        onClick={() => {
          setCurrentSkinIndex(skinIndex);
          props.selectEquipment(props.equipmentId, skinIndex);
        }}
      >
        <div class="sdv-list-item-icon">{sprite}</div>
        <div class="sdv-list-item-text flex margin-right">
          <BigText>{equipment[props.equipmentId].skins[skinIndex]}</BigText>
        </div>

        {isTrigger && equipment[props.equipmentId].skins.length > 1 && (
          <>
            <button
              class={cn("margin-right", {
                "sdv-button-down": !isOpen(),
                "sdv-button-up": isOpen(),
              })}
              data-testid="equipment-dropdown--trigger"
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderPickItem(currentSkinIndex(), true)}
      {isOpen() && renderPicklist()}
    </div>
  );
}
