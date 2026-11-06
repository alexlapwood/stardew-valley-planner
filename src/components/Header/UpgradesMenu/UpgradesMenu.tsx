import { createSignal } from "solid-js";

import { createClickAway } from "../../../helpers/clickAway";
import {
  farmhouseLookOptions,
  greenhouseLookOptions,
  petBowlLookOptions,
} from "../../../helpers/defaultBuildings";
import { createEscapeKey } from "../../../helpers/keyboard";
import HeaderButton from "../HeaderButton/HeaderButton";
import LookSwitch from "./LookSwitch/LookSwitch";

interface IProps {
  changeLooks: (looks: IFarmLooks) => void;
  looks: IFarmLooks;
}

export default function UpgradesMenu(props: IProps) {
  let rootRef: HTMLDivElement | undefined;

  const [isOpen, setIsOpen] = createSignal(false);

  const close = () => {
    setIsOpen(false);
  };

  createClickAway(() => rootRef, isOpen, close);
  createEscapeKey(isOpen, close);

  return (
    <div class="UpgradesMenu" ref={rootRef}>
      <HeaderButton
        growFrom="top"
        icon="🏠"
        isExpanded={isOpen()}
        label="Upgrades"
        onClick={() => {
          setIsOpen(!isOpen());
        }}
        testId="header--upgrades"
      />
      {isOpen() && (
        <div
          class="UpgradesMenu--list sdv-list"
          data-testid="upgrades-menu--list"
        >
          <LookSwitch
            icon="🏠"
            label="Farmhouse"
            look={props.looks.house}
            options={farmhouseLookOptions}
            pick={(house) => {
              props.changeLooks({ ...props.looks, house });
            }}
            testId="house"
          />
          <LookSwitch
            icon="🌿"
            label="Greenhouse"
            look={props.looks.greenhouse}
            options={greenhouseLookOptions}
            pick={(greenhouse) => {
              props.changeLooks({ ...props.looks, greenhouse });
            }}
            testId="greenhouse"
          />
          <LookSwitch
            icon="🐾"
            label="Pet bowl"
            look={props.looks.petBowl}
            options={petBowlLookOptions}
            pick={(petBowl) => {
              props.changeLooks({ ...props.looks, petBowl });
            }}
            testId="pet-bowl"
          />
        </div>
      )}
    </div>
  );
}
