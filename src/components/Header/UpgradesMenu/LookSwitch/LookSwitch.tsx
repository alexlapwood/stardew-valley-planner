import cn from "clsx";
import { For } from "solid-js";

import type { ILookOption } from "../../../../helpers/defaultBuildings";
import BigText from "../../../BigText/BigText";

interface IProps<T> {
  icon: string;
  label: string;
  look: T;
  options: readonly ILookOption<T>[];
  pick: (look: T) => void;
  testId: string;
}

export default function LookSwitch<T extends number | string>(
  props: IProps<T>,
) {
  return (
    <>
      <div class="LookSwitch--label">
        <span class="Header--icon">{props.icon}</span>
        <BigText>{props.label}</BigText>
      </div>
      <div
        aria-label={props.label}
        class="LookSwitch--options"
        data-testid={`upgrades-menu--${props.testId}`}
        role="radiogroup"
      >
        <For each={props.options}>
          {(option) => (
            <div
              aria-checked={option.look === props.look}
              aria-label={option.name}
              class={cn("LookSwitch--option", "sdv-list-item", {
                "sdv-hover-effect": option.look !== props.look,
                selected: option.look === props.look,
              })}
              data-testid={`upgrades-menu--${props.testId}-${option.look}`}
              onClick={() => {
                props.pick(option.look);
              }}
              role="radio"
            >
              <div class="margin-horizontal">
                <BigText>{option.name}</BigText>
              </div>
            </div>
          )}
        </For>
      </div>
    </>
  );
}
