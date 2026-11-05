import cn from "clsx";
import { createSignal } from "solid-js";

import { items } from "../../../../data/game/items.json";
import { atlasSprite } from "../../../../helpers/atlas";
import { getSeasonName } from "../../../../helpers/date";
import BigText from "../../../BigText/BigText";
import Sprite from "../../../Sprite/Sprite";

interface IProps {
  date: number;
  equipmentId: string;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectedItem?: ISelectedItem;
}

const iconSize = 16;

export default function EquipmentMenuItem(props: IProps) {
  const item = () => items[props.equipmentId];
  const [pickedSkin, setPickedSkin] = createSignal<string>();
  const currentSkin = () => pickedSkin() ?? item().skinOrder[0];
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
    item().skinOrder.map((skin) => (
      <div class="margin-left">{renderPickItem(skin)}</div>
    ));

  const renderIcon = (skin: IItemSkin) => {
    const rect = skin.spritesBySeason?.[getSeasonName(props.date)] ?? skin.icon;
    const scale = Math.min(1, iconSize / Math.max(rect[2], rect[3]));

    return (
      <div
        style={{
          height: `${iconSize}px`,
          transform: `scale(${scale})`,
          "transform-origin": "top center",
          "white-space": "nowrap",
          width: `${iconSize}px`,
        }}
      >
        <Sprite {...atlasSprite("items", rect)} />
      </div>
    );
  };

  const renderPickItem = (skinKey: string, isTrigger?: boolean) => {
    const skin = item().skins[skinKey];

    if (skin === undefined) {
      return undefined;
    }

    return (
      <div
        class={cn("sdv-list-item", "flex-horizontal", {
          selected:
            props.selectedItem !== undefined &&
            props.selectedItem.type === "equipment" &&
            props.selectedItem.id === props.equipmentId &&
            props.selectedItem.skin === skinKey,
        })}
        data-testid={`equipment-${props.equipmentId}--${skinKey}`}
        onClick={() => {
          setPickedSkin(skinKey);
          props.selectEquipment(props.equipmentId, skinKey);
        }}
      >
        <div class="sdv-list-item-icon">{renderIcon(skin)}</div>
        <div class="flex margin-right">
          <BigText>{skin.name}</BigText>
        </div>

        {isTrigger === true && item().skinOrder.length > 1 && (
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
      {renderPickItem(currentSkin(), true)}
      {isOpen() && renderPicklist()}
    </div>
  );
}
