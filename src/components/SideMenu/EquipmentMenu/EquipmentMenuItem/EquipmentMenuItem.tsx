import cn from "clsx";
import { createSignal } from "solid-js";

import { items } from "../../../../data/game/items.json";
import { atlasSprite } from "../../../../helpers/atlas";
import { createClickAway } from "../../../../helpers/clickAway";
import { getSeasonName } from "../../../../helpers/date";
import { createEscapeKey } from "../../../../helpers/keyboard";
import BigText from "../../../BigText/BigText";
import Sprite from "../../../Sprite/Sprite";
import { getMatchingSkins, getShownSkin } from "../../sideMenuItems";

interface IProps {
  date: number;
  equipmentId: string;
  isHidden?: boolean;
  isOpen: boolean;
  search?: string;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectedItem?: ISelectedItem;
  setIsOpen: (isOpen: boolean) => void;
}

const iconSize = 16;

export default function EquipmentMenuItem(props: IProps) {
  let rootRef: HTMLDivElement | undefined;

  const item = () => items[props.equipmentId];
  const hasSkins = () => item().skinOrder.length > 1;
  const [pickedSkin, setPickedSkin] = createSignal<string>();
  const currentSkin = () => pickedSkin() ?? item().skinOrder[0];
  const search = () => props.search ?? "";
  const shownSkin = () =>
    getShownSkin(props.equipmentId, currentSkin(), search());

  const isSelected = () =>
    props.selectedItem?.type === "equipment" &&
    props.selectedItem.id === props.equipmentId;

  const close = () => {
    if (props.isOpen) {
      props.setIsOpen(false);
    }
  };

  createClickAway(
    () => rootRef,
    () => props.isOpen,
    close,
  );
  createEscapeKey(() => props.isOpen, close);

  const renderPicklist = () =>
    getMatchingSkins(props.equipmentId, search()).map((skin) => (
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
          selected: isSelected() && props.selectedItem?.skin === skinKey,
        })}
        data-testid={`equipment-${props.equipmentId}--${skinKey}`}
        onClick={() => {
          close();
          setPickedSkin(skinKey);
          props.selectEquipment(props.equipmentId, skinKey);
        }}
      >
        <div class="sdv-list-item-icon">{renderIcon(skin)}</div>
        <div class="EquipmentMenuItem--name flex">
          <BigText>{skin.name}</BigText>
        </div>

        {isTrigger === true && hasSkins() && (
          <>
            <button
              aria-expanded={props.isOpen}
              aria-label={`Skins for ${skin.name}`}
              class={cn("EquipmentMenuItem--toggle", {
                "sdv-button-down": !props.isOpen,
                "sdv-button-up": props.isOpen,
              })}
              data-testid="equipment-dropdown--trigger"
              onClick={(event) => {
                event.stopPropagation();
                props.setIsOpen(!props.isOpen);
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div classList={{ hidden: props.isHidden === true }} ref={rootRef}>
      {renderPickItem(shownSkin(), true)}
      {props.isOpen && renderPicklist()}
    </div>
  );
}
