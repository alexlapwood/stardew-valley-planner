import cn from "clsx";
import type { JSXElement } from "solid-js";

import BigText from "../../BigText/BigText";

export type TGrowFrom = "top" | "top-left" | "top-right";

interface IProps {
  growFrom?: TGrowFrom;
  icon: JSXElement;
  isDisabled?: boolean;
  isExpanded?: boolean;
  label: string;
  onClick?: () => void;
  testId: string;
}

export default function HeaderButton(props: IProps) {
  return (
    <div
      aria-disabled={props.isDisabled}
      aria-expanded={props.isExpanded}
      aria-label={props.label}
      class={cn(
        "Header--button",
        "sdv-button-big",
        "sdv-hover-effect",
        props.growFrom !== undefined && `sdv-grow-from-${props.growFrom}`,
        {
          disabled: props.isDisabled,
          selected: props.isExpanded,
        },
      )}
      data-testid={props.testId}
      onClick={() => {
        props.onClick?.();
      }}
      role="button"
    >
      <div class="Header--label">
        <span class="Header--icon">{props.icon}</span>
        <BigText>{props.label}</BigText>
      </div>
    </div>
  );
}
